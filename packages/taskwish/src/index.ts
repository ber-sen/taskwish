import { ArkErrors, Type, type } from "arktype";
import { Steps } from "./steps";
import { Meta } from "./meta";
import { Exception } from "./exception";
import { Action } from "./action";

export type Entry<T extends object> = Type<T>;

const Entry = <const def>(of: type.validate<def>): type.instantiate<def> =>
  type.raw(of) as never;

Steps(
  ["step 1", () => 3],

  ["step 2", (scope) => scope]
);

const App = (() => {
  return {} as any;
}) as any;

type Pretty<T> = { [K in keyof T]: T[K] } & {};

export interface Scoped<Scope extends Record<any, any>> {}

type ConfigurableKey<T> = T extends ConfigurableUseCase<any, infer Used>
  ? Pretty<Omit<T, Used>>
  : never;

interface ConfigurableUseCase<
  Scope extends Record<any, any>,
  Used extends string = ""
> extends Scoped<Scope> {
  steps: Steps<Scope>;
}

export interface Extendable<Scope> {
  use<const NewScope>(newScope: NewScope): Extendable<NewScope & Scope>;
}

export interface Startable<Scope> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): Scoped<Scope & Record<"input", type.instantiate<Schema>["infer"]>>;
}

export interface AgentFactory<Params, Scope extends Record<any, any> = {}>
  extends Scoped<Scope>,
    Extendable<Scope>,
    Startable<Scope>,
    ConfigurableAgent<Scope> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableAgent<
    Scope & Record<"input", type.instantiate<Schema>["infer"]>
  >;
  use<const NewScope>(
    newScope: NewScope
  ): UseCaseFactory<Params, NewScope & Scope>;
}

interface ConfigurableAgent<Scope extends Record<any, any>>
  extends Scoped<Scope> {
  skills(...skills: any): any;
}

const Agent = <const Params extends string>(
  name: Params
): AgentFactory<Params> => {
  return name as any;
};

export interface UseCaseFactory<Params, Scope extends Record<any, any> = {}>
  extends Scoped<Scope>,
    Extendable<Scope>,
    Startable<Scope>,
    ConfigurableUseCase<Scope> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableUseCase<
    Scope & Record<"input", type.instantiate<Schema>["infer"]>
  >;
  use<const NewScope>(
    newScope: NewScope
  ): UseCaseFactory<Params, NewScope & Scope>;
}

export const UseCase = <const Params extends string>(
  name: Params
): UseCaseFactory<Params> => {
  return name as any;
};

interface ConfigurableInfra<Scope extends Record<any, any>> {
  defs: Steps<Scope>;
}

export interface InfraFactory<Params, Scope extends Record<any, any> = {}>
  extends Scoped<Scope>,
    Extendable<Scope>,
    Startable<Scope>,
    ConfigurableInfra<Scope> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): ConfigurableInfra<Scope & Record<"on", type.instantiate<Schema>["infer"]>>;
  use<const NewScope>(
    newScope: NewScope
  ): InfraFactory<Params, NewScope & Scope>;
}

const Infra = <const Params extends string>(
  name: Params
): InfraFactory<Params> => {
  return name as any;
};

const Page = (asd: string) => {
  return asd as any;
};

export const Options = Object.assign(Symbol("Options"), {
  timeout: (timeout: number) => ({
    timeout,
  }),
});

// Modifiers

const resource = <const K>(key: K, params: { path: string; content: string }) =>
  [key, () => params] as const;

export const Step = <const K, const P>(key: K, params: P) =>
  [key, () => params] as const;

export const run = <const K>(
  key: K,
  params: { channel: string; text: string; [Options]?: any }
) => [key, () => params] as const;

export const events = (asd: string) => ({ language: "string" } as const);

const infra = Infra("asd").defs(
  ["get content", () => "asdas"],

  ({ scope }) =>
    resource("file:config", {
      path: "./src/config.json",
      content: scope.getContent,
    }),

  resource("file:main", { path: "./src/main.ts", content: "{}" })
);

const agent = Agent("My agent")
  .on({ language: "string" })

  .skills();

const useCase = UseCase("Say hello")
  .on("POST:/api/v1/say-hello", { language: "string" })

  .steps(
    ["asdasd", ($) => $.input],

    ({ match }) =>
      match(1 < 2)
        .is(true, Step("asdasd", "asdds"))

        .else(Step("asdasd", "asdds"))
  );

const workflow = UseCase("Say hello")
  .on(events("Gmail.newEmail"))

  .steps(
    ["asdasd", ($) => $.input],

    ({ scope }) =>
      run("Slack.sendMessage", {
        channel: "#general",
        text: `Does someone speak ${scope.asdasd.language}?`,
        [Options]: [Options.timeout(40)],
      }),

    ({ scope }) => Step("asdasd", scope.slackSendMessage)
  );

const MainLayout = () => {};

const home = Page("Home page")
  .on("/")
  .layout(MainLayout)
  .render("<p>hello</p>");

const app = App("My Awesome app")
  .infras(infra)
  .usecases(useCase)
  .agents(agent)
  .pages(home);

app.up();
app.down();
app.cli();
app.listen(3000);
app.run("useCase");
app.chat();

function* Env<const def>(of: type.validate<def>): Generator<
  | Meta<{
      type: "requires";
      requires: "ctx";
      data: type.instantiate<def>["infer"];
    }>
  | Exception<{
      readonly status: 400;
      readonly errors: ArkErrors;
    }>,
  type.instantiate<def>["infer"] | undefined,
  Record<"env", type.instantiate<def>["infer"]>
> {
  const ctx = yield Meta({
    type: "requires",
    requires: "ctx",
    data: {} as type.instantiate<def>["infer"],
  });

  const env = type(of);

  const out = env(ctx.env);

  if (out instanceof type.errors) {
    yield Exception({ status: 400, errors: out });

    return undefined;
  }

  return out;
}

const fetchUsers = Action(async function* (params: { name: string }) {
  const env = yield* Env({ DATABASE_API_KEY: "string" });

  return await Promise.resolve(env?.DATABASE_API_KEY + params.name);
});

async function* steps() {
  const res = yield* fetchUsers.stream({ name: "asdasd" });

  yield Meta({ type: "result", data: res });
  yield Exception({ status: 400, errors: null });
  yield 4;

  return 3;
}
