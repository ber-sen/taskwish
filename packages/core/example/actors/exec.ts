import { Actor, Step, TW } from "../../src";
import { CamelCase, InferSchema, ValidateSchema } from "../../src/helpers";

export function py(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

export const Exec = {
  Step: <
    const Ctx extends Record<any, any>,
    const Name extends string,
    const Result,
    const T,
  >(
    ...args:
      | [
          name: CamelCase<Name>,
          run: ((ctx: TW.Scope<Ctx["scope"]>) => string) | string,
          options: {
            runtime?: "python";
            install?: string[];
            arg0?: (
              ctx: TW.Scope<Ctx["scope"]>,
            ) => [schema: ValidateSchema<T>, value: InferSchema<T>];
            output?: ValidateSchema<Result>;
          },
        ]
      | [
          name: CamelCase<Name>,
          run: ((ctx: TW.Scope<Ctx["scope"]>) => string) | string,
        ]
  ): {
    [TW.Step]: (ctx: Ctx) => {
      name: Ctx["name"];
      steps: Ctx["steps"] & Record<Name, InferSchema<Result>>;
      [TW.Step]: Ctx["step"];
      scope: Record<Name, InferSchema<Result>> & Ctx["scope"];
      last: InferSchema<Result>;
    };
  } => {
    return {} as never;
  },
};

const { MyActor } = Actor("MyActor");

export const { getFileSize } = MyActor()
  .on("Command", "getFileSize")

  .input({ fileName: "string" })

  .run(
    Exec.Step("fileSize", ({ input }) => `stat -f %z ${input.fileName}`, {
      output: "number",
    }),

    Step("notify", function () {
      return this.actions.slack.sendMessage({
        channel: "#general",
        message: `File size of ${this.input.fileName} is ${this.fileSize}`,
      });
    }),

    Step("return", function () {
      return this.fileSize;
    }),
  );
