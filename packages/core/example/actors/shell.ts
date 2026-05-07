import { Actor, Step, TW } from "../../src";
import { CamelCase, InferSchema, ValidateSchema } from "../../src/helpers";

const { MyActor } = Actor("MyActor");

export function py(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

export const Shell = {
  Step: <
    const Ctx extends Record<any, any>,
    const Name extends string,
    const Result,
  >(
    ...args:
      | [
          name: CamelCase<Name>,
          options: {
            runtime?: "python";
            install?: string[];
            output?: ValidateSchema<Result>;
          },
          run: ((ctx: TW.Scope<Ctx["scope"]>) => string) | string,
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

export const { getFileSize } = MyActor()
  .on("Command", "getFileSize")

  .input({ fileName: "string" })

  .run(
    Shell.Step("fileSize", { output: "number" }, (s) => `stat -f %z ${s.input.fileName}`),

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
