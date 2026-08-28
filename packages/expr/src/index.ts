import jsep from "jsep";

type JsonPrimitive = string | number | boolean | null;

export const ToCEL = Symbol.for("TW.Expression.ToCEL");
export const ToFn = Symbol.for("TW.Expression.ToFn");

export type CELExpression<Scope = unknown, Value = unknown> = {
  [ToCEL](): string;
  [ToFn](scope: Scope): Value;
};

type ArrayExpression<Scope, Value> = NonNullable<Value> extends readonly (
  infer Item
)[]
  ? {
      filter(predicate: (item: Item) => boolean): Expression<Scope, Value>;
      map<Result>(
        transform: (item: Item) => Result,
      ): Expression<Scope, Result[]>;
    }
  : {};

type PropertyExpression<Scope, Value> = NonNullable<Value> extends readonly unknown[]
  ? {}
  : NonNullable<Value> extends object
    ? {
        readonly [Property in keyof NonNullable<Value> & string]: Expression<
          Scope,
          NonNullable<Value>[Property]
        >;
      }
    : {};

/** A CEL-backed property/array expression rooted at an action result. */
export type Expression<Scope, Value = Scope> =
  CELExpression<Scope, Value> &
  ArrayExpression<Scope, Value> &
  PropertyExpression<Scope, Value>;

type DynamicExpression = CELExpression<any, any> &
  DynamicArrayExpression &
  DynamicProperties;

interface DynamicProperties {
  readonly [property: string]: DynamicExpression;
}

type DynamicArrayExpression = {
  filter(predicate: (item: any) => boolean): DynamicExpression;
  map<Result>(transform: (item: any) => Result): DynamicExpression;
};

type Operation =
  | {
      kind: "filter";
      alias: string;
      expression: string;
      callback: (item: any) => boolean;
    }
  | {
      kind: "map";
      alias: string;
      fields?: Record<string, string>;
      expression?: string;
      callback: (item: any) => any;
    };

type FunctionExpression = {
  parameter: string;
  body: string;
};

function stripOuterParens(expression: string): string {
  let current = expression.trim();

  while (current.startsWith("(") && current.endsWith(")")) {
    const inner = current.slice(1, -1).trim();
    if (!hasBalancedParens(inner)) break;
    current = inner;
  }

  return current;
}

function hasBalancedParens(input: string): boolean {
  let depth = 0;
  for (const character of input) {
    if (character === "(") depth++;
    if (character === ")") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function normalizeFunctionBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) return stripOuterParens(trimmed);

  const returnMatch = trimmed.match(/^\{\s*return\s+([\s\S]*?);?\s*\}$/);
  if (!returnMatch) {
    throw new Error("Expression callbacks must return a single expression");
  }

  return stripOuterParens(returnMatch[1].trim());
}

function extractFunctionExpression(callback: Function): FunctionExpression {
  const source = callback.toString().trim();
  const arrowIndex = source.indexOf("=>");

  let parameterSource: string;
  let bodySource: string;

  if (arrowIndex !== -1) {
    parameterSource = source.slice(0, arrowIndex).trim();
    bodySource = source.slice(arrowIndex + 2).trim();
  } else {
    const functionMatch = source.match(
      /^(?:async\s+)?function(?:\s+\w+)?\s*\(([^)]*)\)\s*(\{[\s\S]*\})$/,
    );
    if (!functionMatch) {
      throw new Error(`Cannot extract an expression from callback: ${source}`);
    }
    parameterSource = functionMatch[1].trim();
    bodySource = functionMatch[2];
  }

  const parameter = stripOuterParens(parameterSource).trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(parameter)) {
    throw new Error("Expression callbacks must have one identifier parameter");
  }

  const body = normalizeFunctionBody(bodySource);
  if (!body) throw new Error("Expression callbacks cannot be empty");

  return { parameter, body };
}

function identifierName(node: jsep.Expression): string | undefined {
  return node.type === "Identifier" && typeof node.name === "string"
    ? node.name
    : undefined;
}

function memberPath(node: jsep.Expression, root: string): string {
  if (node.type === "Identifier") {
    const name = identifierName(node);
    if (name === root) return root;
  }

  if (node.type !== "MemberExpression") {
    throw new Error("Map values must be property paths of the callback item");
  }

  const member = node as jsep.MemberExpression;
  const object = memberPath(member.object, root);
  let property: string | undefined;

  if (!member.computed) {
    property = identifierName(member.property);
  } else if (
    member.property.type === "Literal" &&
    typeof member.property.value === "string"
  ) {
    property = member.property.value;
  }

  if (!property || !/^[A-Za-z_$][\w$]*$/.test(property)) {
    throw new Error("Map values must use identifier property paths");
  }

  return `${object}.${property}`;
}

function precedence(node: jsep.Expression): number {
  if (node.type === "ConditionalExpression") return 1;
  if (node.type !== "BinaryExpression") return 10;

  switch ((node as jsep.BinaryExpression).operator) {
    case "||":
      return 2;
    case "&&":
      return 3;
    case "==":
    case "!=":
    case "===":
    case "!==":
      return 4;
    case "<":
    case "<=":
    case ">":
    case ">=":
      return 5;
    case "+":
    case "-":
      return 6;
    case "*":
    case "/":
    case "%":
      return 7;
    default:
      return 0;
  }
}

function childToCEL(
  node: jsep.Expression,
  parentPrecedence: number,
  right = false,
): string {
  const rendered = astToCEL(node);
  const childPrecedence = precedence(node);
  return childPrecedence < parentPrecedence ||
    (right && childPrecedence === parentPrecedence && childPrecedence < 10)
    ? `(${rendered})`
    : rendered;
}

function astToCEL(node: jsep.Expression): string {
  switch (node.type) {
    case "Literal": {
      const value = (node as jsep.Literal).value;
      if (
        value !== null &&
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean"
      ) {
        throw new Error("CEL expressions do not support this literal");
      }
      return JSON.stringify(value);
    }
    case "Identifier":
      return (node as jsep.Identifier).name;
    case "ArrayExpression":
      return `[${(node as jsep.ArrayExpression).elements
        .map((element) => {
          if (!element) throw new Error("CEL arrays cannot contain holes");
          return astToCEL(element);
        })
        .join(", ")}]`;
    case "MemberExpression": {
      const member = node as jsep.MemberExpression;
      const object = childToCEL(member.object, 9);
      if (member.computed) {
        return `${object}[${astToCEL(member.property)}]`;
      }
      const property = identifierName(member.property);
      if (!property) throw new Error("CEL member names must be identifiers");
      return `${object}.${property}`;
    }
    case "UnaryExpression": {
      const unary = node as jsep.UnaryExpression;
      if (
        unary.operator === "!" &&
        unary.argument.type === "Literal" &&
        typeof (unary.argument as jsep.Literal).value === "number"
      ) {
        return String(!(unary.argument as jsep.Literal).value);
      }
      if (!["!", "+", "-"].includes(unary.operator)) {
        throw new Error(`Unsupported CEL unary operator ${unary.operator}`);
      }
      return `${unary.operator}${childToCEL(unary.argument, 8)}`;
    }
    case "BinaryExpression": {
      const binary = node as jsep.BinaryExpression;
      const operator =
        binary.operator === "==="
          ? "=="
          : binary.operator === "!=="
            ? "!="
            : binary.operator;
      const ownPrecedence = precedence(node);
      if (ownPrecedence === 0) {
        throw new Error(`Unsupported CEL binary operator ${binary.operator}`);
      }
      return `${childToCEL(binary.left, ownPrecedence)} ${operator} ${childToCEL(
        binary.right,
        ownPrecedence,
        true,
      )}`;
    }
    case "ConditionalExpression": {
      const conditional = node as jsep.ConditionalExpression;
      return `${childToCEL(conditional.test, 1)} ? ${astToCEL(
        conditional.consequent,
      )} : ${astToCEL(conditional.alternate)}`;
    }
    default:
      throw new Error(`Unsupported CEL expression node ${node.type}`);
  }
}

function parseMap(callback: Function): {
  alias: string;
  fields?: Record<string, string>;
  expression?: string;
} {
  const { parameter, body } = extractFunctionExpression(callback);
  if (!body.trim().startsWith("{")) {
    return { alias: parameter, expression: astToCEL(jsep(body)) };
  }

  const entries = parseObjectEntries(body);
  if (entries.size === 0) throw new Error("Map callbacks must return an object");

  return {
    alias: parameter,
    fields: Object.fromEntries(
      [...entries].map(([key, value]) => [key, memberPath(jsep(value), parameter)]),
    ),
  };
}

function splitTopLevel(source: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;
  let quote = "";
  let escaped = false;

  for (let index = 0; index < source.length; index++) {
    const character = source[index]!;
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") roundDepth++;
    else if (character === ")") roundDepth--;
    else if (character === "[") squareDepth++;
    else if (character === "]") squareDepth--;
    else if (character === "{") curlyDepth++;
    else if (character === "}") curlyDepth--;
    else if (
      character === separator &&
      roundDepth === 0 &&
      squareDepth === 0 &&
      curlyDepth === 0
    ) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(source.slice(start).trim());
  return parts.filter(Boolean);
}

function parseObjectEntries(body: string): Map<string, string> {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new Error("Map callbacks must return { value, label }");
  }

  const entries = new Map<string, string>();
  for (const entry of splitTopLevel(trimmed.slice(1, -1), ",")) {
    const [keySource, ...valueParts] = splitTopLevel(entry, ":");
    const key = keySource?.replace(/^["']|["']$/g, "");
    const value = valueParts.length
      ? valueParts.join(":").trim()
      : key && /^[A-Za-z_$][\w$]*$/.test(key)
        ? key
        : "";
    if (!key || !value) {
      throw new Error("Map callbacks must return an object");
    }
    if (entries.has(key)) throw new Error(`Duplicate map field ${key}`);
    entries.set(key, value);
  }
  return entries;
}

function parseFilter(callback: Function): {
  alias: string;
  expression: string;
} {
  const { parameter, body } = extractFunctionExpression(callback);
  return { alias: parameter, expression: astToCEL(jsep(body)) };
}

function valueAtPath(value: unknown, path: string): unknown {
  if (!path) return value;

  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object" && typeof current !== "function") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

function expressionToCEL(
  path: string,
  operations: readonly Operation[],
): string {
  let expression = path ? `result.${path}` : "result";

  for (const operation of operations) {
    expression =
      operation.kind === "filter"
        ? `${expression}.filter(${operation.alias}, ${operation.expression})`
        : `${expression}.map(${operation.alias}, ${
            operation.expression ??
            `{${Object.entries(operation.fields ?? {})
              .map(([key, value]) => `${JSON.stringify(key)}: ${value}`)
              .join(", ")}}`
          })`;
  }

  return expression;
}

function runOperations(
  scope: unknown,
  path: string,
  operations: readonly Operation[],
): unknown {
  let current = valueAtPath(scope, path);

  for (const operation of operations) {
    if (!Array.isArray(current)) {
      throw new TypeError(
        `${path || "$"}.${operation.kind} requires an array value`,
      );
    }
    current =
      operation.kind === "filter"
        ? current.filter(operation.callback)
        : current.map(operation.callback);
  }

  return current;
}

function createExpression(
  path: string,
  operations: readonly Operation[] = [],
): DynamicExpression {
  const target = Object.create(null) as DynamicExpression;

  return new Proxy(target, {
    get(_target, property) {
      if (property === "toJSON") return undefined;
      if (property === ToCEL) {
        return () => expressionToCEL(path, operations);
      }
      if (property === ToFn) {
        return (scope: unknown) => runOperations(scope, path, operations);
      }
      if (property === "filter") {
        return (callback: (item: any) => boolean) => {
          if (operations.some((operation) => operation.kind === "map")) {
            throw new Error("filter must be applied before map");
          }
          if (operations.some((operation) => operation.kind === "filter")) {
            throw new Error("An expression can contain only one filter operation");
          }
          const parsed = parseFilter(callback);
          return createExpression(path, [
            ...operations,
            { kind: "filter", ...parsed, callback },
          ]);
        };
      }
      if (property === "map") {
        return (
          callback: (item: any) => {
            value: string | number;
            label: string;
          },
        ) => {
          if (operations.some((operation) => operation.kind === "map")) {
            throw new Error("An expression can contain only one map operation");
          }
          const parsed = parseMap(callback);
          return createExpression(path, [
            ...operations,
            { kind: "map", ...parsed, callback },
          ]);
        };
      }
      if (property === Symbol.toPrimitive) {
        return () => expressionToCEL(path, operations);
      }
      if (property === Symbol.toStringTag) return "TaskWishExpression";
      if (typeof property === "symbol") return undefined;
      if (operations.length > 0) {
        throw new Error("Property paths must be selected before filter or map");
      }
      return createExpression(path ? `${path}.${property}` : property);
    },
  });
}

/**
 * The root expression proxy. Select nested values with `$.some.path`, then use
 * CEL list macros through `filter` and/or `map` when the value is an array.
 */
export const $: DynamicExpression = createExpression("");

function safeProperty(value: unknown, property: unknown): unknown {
  if (
    property === "__proto__" ||
    property === "prototype" ||
    property === "constructor"
  ) {
    throw new Error(`Unsafe CEL property ${String(property)}`);
  }
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object" && typeof value !== "function") return undefined;
  return (value as Record<PropertyKey, unknown>)[property as PropertyKey];
}

function evaluateAst(
  node: jsep.Expression,
  bindings: Record<string, unknown>,
): unknown {
  switch (node.type) {
    case "Literal":
      return (node as jsep.Literal).value as JsonPrimitive;
    case "Identifier":
      return bindings[(node as jsep.Identifier).name];
    case "ArrayExpression":
      return (node as jsep.ArrayExpression).elements.map((element) => {
        if (!element) throw new Error("CEL arrays cannot contain holes");
        return evaluateAst(element, bindings);
      });
    case "MemberExpression": {
      const member = node as jsep.MemberExpression;
      const object = evaluateAst(member.object, bindings);
      const property = member.computed
        ? evaluateAst(member.property, bindings)
        : (member.property as jsep.Identifier).name;
      return safeProperty(object, property);
    }
    case "UnaryExpression": {
      const unary = node as jsep.UnaryExpression;
      const argument = evaluateAst(unary.argument, bindings);
      if (unary.operator === "!") return !argument;
      if (unary.operator === "+") return Number(argument);
      if (unary.operator === "-") return -Number(argument);
      throw new Error(`Unsupported CEL unary operator ${unary.operator}`);
    }
    case "BinaryExpression": {
      const binary = node as jsep.BinaryExpression;
      if (binary.operator === "&&") {
        return (
          evaluateAst(binary.left, bindings) &&
          evaluateAst(binary.right, bindings)
        );
      }
      if (binary.operator === "||") {
        return (
          evaluateAst(binary.left, bindings) ||
          evaluateAst(binary.right, bindings)
        );
      }
      const left = evaluateAst(binary.left, bindings) as any;
      const right = evaluateAst(binary.right, bindings) as any;
      switch (binary.operator) {
        case "==":
        case "===":
          return left === right;
        case "!=":
        case "!==":
          return left !== right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case ">":
          return left > right;
        case ">=":
          return left >= right;
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "%":
          return left % right;
        default:
          throw new Error(`Unsupported CEL binary operator ${binary.operator}`);
      }
    }
    case "ConditionalExpression": {
      const conditional = node as jsep.ConditionalExpression;
      return evaluateAst(conditional.test, bindings)
        ? evaluateAst(conditional.consequent, bindings)
        : evaluateAst(conditional.alternate, bindings);
    }
    case "CallExpression": {
      const call = node as jsep.CallExpression;
      if (
        call.callee.type === "Identifier" &&
        identifierName(call.callee) === "__taskwish_option" &&
        call.arguments.length === 2
      ) {
        return {
          value: evaluateAst(call.arguments[0]!, bindings),
          label: evaluateAst(call.arguments[1]!, bindings),
        };
      }
      if (
        call.callee.type === "Identifier" &&
        identifierName(call.callee) === "__taskwish_object" &&
        call.arguments.length % 2 === 0
      ) {
        const object: Record<string, unknown> = {};
        for (let index = 0; index < call.arguments.length; index += 2) {
          const key = evaluateAst(call.arguments[index]!, bindings);
          if (typeof key !== "string") throw new Error("CEL object keys must be strings");
          object[key] = evaluateAst(call.arguments[index + 1]!, bindings);
        }
        return object;
      }
      if (call.callee.type !== "MemberExpression") {
        throw new Error("Only CEL list macros are supported");
      }
      const callee = call.callee as jsep.MemberExpression;
      const macro = !callee.computed ? identifierName(callee.property) : undefined;
      const [aliasNode, expressionNode] = call.arguments;
      const alias = aliasNode ? identifierName(aliasNode) : undefined;
      if (
        (macro !== "filter" && macro !== "map") ||
        !alias ||
        !expressionNode ||
        call.arguments.length !== 2
      ) {
        throw new Error("Invalid CEL list macro");
      }
      const values = evaluateAst(callee.object, bindings);
      if (!Array.isArray(values)) {
        throw new TypeError(`CEL ${macro} requires a list`);
      }
      if (macro === "filter") {
        return values.filter((item) =>
          Boolean(
            evaluateAst(expressionNode, { ...bindings, [alias]: item }),
          ),
        );
      }
      return values.map((item) =>
        evaluateAst(expressionNode, { ...bindings, [alias]: item }),
      );
    }
    default:
      throw new Error(`Unsupported CEL expression node ${node.type}`);
  }
}

function prepareCELForParser(expression: string): string {
  return expression.replace(/\{([^{}]*)\}/g, (source) => {
    const entries = parseObjectEntries(source);
    const argumentsList = [...entries].flatMap(([key, value]) => [
      JSON.stringify(key),
      value,
    ]);
    return `__taskwish_object(${argumentsList.join(", ")})`;
  });
}

/** Evaluate the supported CEL subset against an action result. */
export function evaluateCEL(expression: string, result: unknown): unknown {
  return evaluateAst(jsep(prepareCELForParser(expression)), { result });
}
