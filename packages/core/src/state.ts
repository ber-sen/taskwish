import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { scope, type } from "arktype";

import { TW } from "./core";
import type { InferSchema, Pretty } from "./helpers";

const StateDefinition = Symbol("Taskwish.StateDefinition");
const StateListDefinition = Symbol("Taskwish.StateListDefinition");
const StateValueDefinition = Symbol("Taskwish.StateValueDefinition");
const StateStoreDefinition = Symbol("Taskwish.StateStoreDefinition");

const stateScope = scope({
  primary: scope({
    uuidv4: scope({
      random: "string.uuid.v4",
    }).export(),
  }).export(),
});

type StateScope = typeof stateScope.t;

type StateListDescriptor<Schema = unknown> = {
  readonly [StateListDefinition]: true;
  readonly schema: Schema;
};

type PrimaryRandomUUID = "primary.uuidv4.random";

type StateListTypeSchema<Schema> = Schema extends Record<string, unknown>
  ? {
      [Key in keyof Schema]: Schema[Key] extends PrimaryRandomUUID
        ? "string.uuid.v4"
        : Schema[Key];
    }
  : Schema;

type StateListItem<Schema> = InferSchema<StateListTypeSchema<Schema>>;

type PrimaryRandomKeys<Schema> = Schema extends Record<string, unknown>
  ? {
      [Key in keyof Schema]: Schema[Key] extends PrimaryRandomUUID ? Key : never;
    }[keyof Schema]
  : never;

type WithOptionalKeys<Value, Keys extends PropertyKey> = Value extends object
  ? Omit<Value, Extract<keyof Value, Keys>> &
      Partial<Pick<Value, Extract<keyof Value, Keys>>>
  : Value;

type StateListInput<Schema> = WithOptionalKeys<
  StateListItem<Schema>,
  PrimaryRandomKeys<Schema>
>;

interface StateListValue<Item, Input> extends Array<Item> {
  push(...items: Item[]): number;
  push(...items: Input[]): number;
  unshift(...items: Item[]): number;
  unshift(...items: Input[]): number;
}

type StateScalar = string | number | boolean;

type WidenStateScalar<Value extends StateScalar> = Value extends string
  ? string
  : Value extends number
    ? number
    : boolean;

type StateValue<Fields> = Pretty<{
  -readonly [Key in keyof Fields]: Fields[Key] extends StateListDescriptor<
    infer Schema
  >
    ? StateListValue<StateListItem<Schema>, StateListInput<Schema>>
    : Fields[Key] extends StateScalar
      ? WidenStateScalar<Fields[Key]>
      : never;
}>;

type ValidateStateFields<Fields> = {
  [Key in keyof Fields]: Fields[Key] extends StateListDescriptor
    ? Fields[Key]
    : Fields[Key] extends StateScalar
      ? Fields[Key]
      : `State field "${Key & string}" must be a primitive initial value or declared with State.List(...)`;
};

type StateResult<Fields, Ctx extends Record<any, any>> = {
  state: StateValue<Fields>;
  [TW.Step]: (ctx: Ctx) => {
    name: Ctx["name"];
    steps: Ctx["steps"];
    step: Ctx["step"];
    scope: { state: StateValue<Fields> } & Ctx["scope"];
    last: { state: StateValue<Fields> };
    plugins: Ctx["plugins"];
  };
};

type PreserveContext<Ctx extends Record<any, any>> = {
  name: Ctx["name"];
  steps: Ctx["steps"];
  step: Ctx["step"];
  scope: Ctx["scope"];
  last: Ctx["last"];
  plugins: Ctx["plugins"];
};

type StateStoreResult<Ctx extends Record<any, any>> = {
  [TW.Step]: (ctx: Ctx) => PreserveContext<Ctx>;
};

export interface StateStore {
  /** Loads the actor's state. */
  load(actorName: string): unknown | undefined;
  /** Saves the actor's state. */
  save(actorName: string, state: Record<string, unknown>): void;
}

export type StoreOptions = {
  adapter: "fs";
  /** Defaults to `TW_DEFAULT_STORE_PATH`, then `<cwd>/state`. */
  directory?: string;
};

type RuntimeListDescriptor = StateListDescriptor & {
  validator: { assert(input: unknown): unknown };
};

type RuntimeValueDescriptor = {
  [StateValueDefinition]: true;
  initial: StateScalar;
  validator: { assert(input: unknown): unknown };
};

type RuntimeFieldDescriptor = RuntimeListDescriptor | RuntimeValueDescriptor;

type RuntimeState = Record<string, unknown>;

function expandStateListSchema(schema: unknown): unknown {
  if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }

  return Object.fromEntries(
    Object.entries(schema).map(([key, definition]) => [
      key,
      definition === "primary.uuidv4.random"
        ? [definition, "=", () => randomUUID()]
        : definition,
    ])
  );
}

type RuntimeDefinition = {
  [StateDefinition]: true;
  fields: Record<string, RuntimeFieldDescriptor>;
  instances: Map<string, RuntimeState>;
};

type RuntimeStore = {
  [StateStoreDefinition]: true;
  store: StateStore;
};

function safeActorName(actorName: string): string {
  const safe = actorName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safe || "actor";
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read state from ${path}`, { cause: error });
  }
}

function writeJsonAtomic(path: string, value: unknown): void {
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) {
    throw new TypeError(`State for ${path} is not JSON serializable`);
  }
  writeFileSync(temporaryPath, `${serialized}\n`, "utf8");
  renameSync(temporaryPath, path);
}

function fileSystemStateStore(
  options: Omit<StoreOptions, "adapter"> = {}
): StateStore {
  const directory = resolve(
    options.directory ??
      process.env.TW_DEFAULT_STORE_PATH ??
      join(process.cwd(), "state")
  );

  return {
    load(actorName) {
      mkdirSync(directory, { recursive: true });
      const name = safeActorName(actorName);
      const path = join(directory, `${name}.json`);

      if (existsSync(path)) return readJson(path);
      return undefined;
    },
    save(actorName, state) {
      mkdirSync(directory, { recursive: true });
      const name = safeActorName(actorName);
      writeJsonAtomic(join(directory, `${name}.json`), state);
    },
  };
}

function observable<T extends object>(
  value: T,
  onChange: () => void,
  proxies = new WeakMap<object, object>()
): T {
  const existing = proxies.get(value);
  if (existing) return existing as T;

  let transactionDepth = 0;
  const arrayMutators = new Set<PropertyKey>([
    "copyWithin",
    "fill",
    "pop",
    "push",
    "reverse",
    "shift",
    "sort",
    "splice",
    "unshift",
  ]);

  const proxy = new Proxy(value, {
    get(target, property, receiver) {
      const result = Reflect.get(target, property, receiver);

      if (
        Array.isArray(target) &&
        arrayMutators.has(property) &&
        typeof result === "function"
      ) {
        return (...args: unknown[]) => {
          transactionDepth += 1;
          try {
            return Reflect.apply(result, receiver, args);
          } finally {
            transactionDepth -= 1;
            if (transactionDepth === 0) onChange();
          }
        };
      }

      return result !== null && typeof result === "object"
        ? observable(result, onChange, proxies)
        : result;
    },
    set(target, property, next, receiver) {
      const previous = Reflect.get(target, property, receiver);
      const changed = previous !== next;
      const didSet = Reflect.set(target, property, next, receiver);
      if (didSet && changed && transactionDepth === 0) onChange();
      return didSet;
    },
    deleteProperty(target, property) {
      const existed = Reflect.has(target, property);
      const deleted = Reflect.deleteProperty(target, property);
      if (deleted && existed && transactionDepth === 0) onChange();
      return deleted;
    },
  });

  proxies.set(value, proxy);
  return proxy;
}

function validateState(
  fields: Record<string, RuntimeFieldDescriptor>,
  state: RuntimeState
): void {
  for (const [field, descriptor] of Object.entries(fields)) {
    const value = state[field];
    if (StateListDefinition in descriptor) {
      if (!Array.isArray(value)) {
        throw new TypeError(`State field "${field}" must be an array`);
      }

      for (let index = 0; index < value.length; index += 1) {
        try {
          const input = value[index];
          const output = descriptor.validator.assert(input);

          if (
            input !== output &&
            input !== null &&
            output !== null &&
            typeof input === "object" &&
            typeof output === "object" &&
            !Array.isArray(input) &&
            !Array.isArray(output)
          ) {
            for (const key of Object.keys(input)) {
              if (!(key in output)) delete (input as RuntimeState)[key];
            }
            Object.assign(input, output);
          } else {
            value[index] = output;
          }
        } catch (error) {
          throw new TypeError(
            `Invalid value at state.${field}[${index}]: ${String(error)}`,
            { cause: error }
          );
        }
      }
      continue;
    }

    try {
      descriptor.validator.assert(value);
    } catch (error) {
      throw new TypeError(
        `Invalid value at state.${field}: ${String(error)}`,
        { cause: error }
      );
    }
  }
}

function initialStateValue(descriptor: RuntimeFieldDescriptor): unknown {
  if (StateListDefinition in descriptor) return [];
  return descriptor.initial;
}

function createStateInstance(
  definition: RuntimeDefinition,
  actorName: string,
  store: StateStore
): RuntimeState {
  const stored = store.load(actorName) ?? {};
  if (stored === null || typeof stored !== "object" || Array.isArray(stored)) {
    throw new TypeError(`Stored state for ${actorName} must be an object`);
  }

  const rawState: RuntimeState = {};
  for (const [field, descriptor] of Object.entries(definition.fields)) {
    const value = (stored as RuntimeState)[field];
    rawState[field] =
      value === undefined ? initialStateValue(descriptor) : value;
  }
  validateState(definition.fields, rawState);

  let state!: RuntimeState;
  const persist = () => {
    validateState(definition.fields, rawState);
    const raw = Object.fromEntries(
      Object.keys(definition.fields).map((field) => [field, rawState[field]])
    );
    store.save(actorName, raw);
  };

  state = observable(rawState, persist);
  return state;
}

export function isStateDefinition(value: unknown): value is RuntimeDefinition {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as Partial<RuntimeDefinition>)[StateDefinition] === true
  );
}

export function isStateStore(value: unknown): value is RuntimeStore {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as Partial<RuntimeStore>)[StateStoreDefinition] === true
  );
}

export function bindStateDefinition(
  definition: RuntimeDefinition,
  actorName: string,
  runtimeStore?: RuntimeStore
): RuntimeState {
  const existing = definition.instances.get(actorName);
  if (existing) return existing;

  const state = createStateInstance(
    definition,
    actorName,
    runtimeStore?.store ?? fileSystemStateStore()
  );
  definition.instances.set(actorName, state);
  return state;
}

interface StateFactory {
  <
    const Fields extends Record<string, unknown>,
    Ctx extends Record<any, any> = { scope: {} },
  >(
    fields: Fields & ValidateStateFields<Fields>
  ): StateResult<Fields, Ctx>;

  List<const Schema>(
    schema: type.validate<Schema, StateScope>
  ): StateListDescriptor<Schema>;
}

export function Store<Ctx extends Record<any, any> = { scope: {} }>(
  options: StoreOptions
): StateStoreResult<Ctx> {
  switch (options.adapter) {
    case "fs":
      return {
        [StateStoreDefinition]: true,
        store: fileSystemStateStore(options),
      } as unknown as StateStoreResult<Ctx>;
  }
}

export const State: StateFactory = Object.assign(
  (fieldsDefinition: Record<string, unknown>) => {
    const fields: Record<string, RuntimeFieldDescriptor> = {};
    for (const [field, definition] of Object.entries(fieldsDefinition)) {
      if (
        definition !== null &&
        typeof definition === "object" &&
        StateListDefinition in definition
      ) {
        fields[field] = definition as RuntimeListDescriptor;
        continue;
      }

      if (
        typeof definition === "string" ||
        typeof definition === "number" ||
        typeof definition === "boolean"
      ) {
        const domain = typeof definition as "string" | "number" | "boolean";
        fields[field] = {
          [StateValueDefinition]: true,
          initial: definition,
          validator: stateScope.type(domain),
        };
        continue;
      }

      throw new TypeError(
        `State field "${field}" must be a primitive initial value or declared with State.List(...)`
      );
    }

    return {
      state: {
        [StateDefinition]: true,
        fields,
        instances: new Map(),
      } as RuntimeDefinition,
    };
  },
  {
    List(schema: unknown) {
      return {
        [StateListDefinition]: true,
        schema,
        validator: stateScope.type(expandStateListSchema(schema) as never),
      };
    },
  }
) as unknown as StateFactory;
