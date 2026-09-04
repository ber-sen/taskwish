import { Actor, Step, TW } from "../../src";
import { CamelCase } from "../../src/helpers";

const { actor } = Actor("Example");

type FFITypeName =
  | "void"
  | "bool"
  | "char"
  | "cstring"
  | "int8_t"
  | "i8"
  | "int16_t"
  | "i16"
  | "int32_t"
  | "i32"
  | "int"
  | "int64_t"
  | "i64"
  | "uint8_t"
  | "u8"
  | "uint16_t"
  | "u16"
  | "uint32_t"
  | "u32"
  | "uint64_t"
  | "u64"
  | "double"
  | "f64"
  | "float"
  | "f32"
  | "ptr"
  | "pointer"
  | "function";

type FFISchema = FFITypeName | { [key: string]: FFISchema };

type FFITypeNameToTS<T extends FFITypeName> = T extends "bool"
  ? boolean
  : T extends "int64_t" | "i64" | "uint64_t" | "u64"
  ? bigint
  : T extends "void"
  ? void
  : T extends "char" | "cstring"
  ? string
  : number;

type InferFFISchema<T> = T extends FFITypeName
  ? FFITypeNameToTS<T & FFITypeName>
  : { [K in keyof T]: InferFFISchema<T[K]> };

type PythonTypeName = "str" | "int" | "float" | "bool" | "None" | "bytes";
type PythonSchema = PythonTypeName | { [key: string]: PythonSchema };

type PythonTypeNameToTS<T extends PythonTypeName> = T extends "bool"
  ? boolean
  : T extends "None"
  ? void
  : T extends "str"
  ? string
  : T extends "bytes"
  ? Uint8Array
  : number;

type InferPythonSchema<T> = T extends PythonTypeName
  ? PythonTypeNameToTS<T & PythonTypeName>
  : { [K in keyof T]: InferPythonSchema<T[K]> };

type RuntimeSchema<R> = R extends "python" ? PythonSchema : FFISchema;
type InferRuntimeSchema<T, R> = R extends "python"
  ? InferPythonSchema<T>
  : InferFFISchema<T>;

export function py(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

export const FFI = {
  Step: <
    const Ctx extends Record<any, any>,
    const Name extends string,
    const Runtime extends "python" | undefined = undefined,
    const Result extends RuntimeSchema<Runtime> = RuntimeSchema<Runtime>
  >(
    ..._args:
      | [
          name: CamelCase<Name>,
          run: ((ctx: TW.Scope<Ctx["scope"]>) => string) | string,
          options: {
            runtime?: Runtime;
            install?: string[];
            input?: (ctx: TW.Scope<Ctx["scope"]>) => any[];
            output?: Result;
          }
        ]
      | [
          name: CamelCase<Name>,
          run: ((ctx: TW.Scope<Ctx["scope"]>) => string) | string
        ]
  ): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"] & Record<Name, InferRuntimeSchema<Result, Runtime>>;
      step: Ctx["step"];
      scope: Record<Name, InferRuntimeSchema<Result, Runtime>> & Ctx["scope"];
      last: InferRuntimeSchema<Result, Runtime>;
    };
  } => {
    return {} as never;
  },
};

export const { runPython } = actor()
  .on("Command", "runPython")

  .run(
    Step("baseUrl", function () {
      return "https://api.github.com/users/";
    }),

    FFI.Step(
      "pyStep",

      py`
        import requests 

        def step(baseUrl, req):
            url = f"{baseUrl}/{req['username']}"
            response = requests.get(url)

            if response.status_code == 200:
                data = response.json()

                return {
                    "name": data.get("name"),
                    "company": data.get("company"),
                    "public_repos": data.get("public_repos"),
                    "followers": data.get("followers"),
                }

            raise ValueError("User not found")
      `,

      {
        runtime: "python",
        install: ["requests==2.31.0"],
        input: (ctx) => [ctx.baseUrl, { username: "ber-sen" }],
        output: {
          name: "str",
          company: "str",
          public_repos: "str",
          followers: "int",
        },
      }
    ),

    Step("return", function () {
      return this.pyStep.company;
    })
  );

export const { Example } = actor().service({ runPython });
