import { Actor, Step, TW } from "../../src";
import { InferSchema, ValidateSchema } from "../../src/helpers";

const { MyActor } = Actor("MyActor");

export function py(strings: TemplateStringsArray, ...values: any[]) {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

const Shell = {
  Step: <Ctx extends Record<any, any>, Name extends string, const Result>(
    name: Name,
    options: {
      use: "python",
      install?: string[];
      output?: ValidateSchema<Result>;
    },
    run: (ctx: TW.Scope<Ctx["scope"]>) => string | string,
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

export const { runPython } = MyActor()
  .on("Command", "runPython")

  .run(
    Step("baseUrl", function () {
      return "https://api.github.com/users/";
    }),

    Shell.Step(
      "pyStep",

      {
        use: "python",
        install: ["requests"],
        output: {
          name: "string",
          company: "string",
          public_repos: "string",
          followers: "number",
        },
      },

      (ctx) => py`
        import requests

        def fetch_github_user(username):
            url = f"${ctx.baseUrl}/{username}"
            response = requests.get(url)

            if response.status_code == 200:
                data = response.json()
                return {
                    "name": data.get("name"),
                    "company": data.get("company"),
                    "public_repos": data.get("public_repos"),
                    "followers": data.get("followers"),
                }
            else:
                return {"error": "User not found"}

        if __name__ == "__main__":
            user = "octocat"
            result = fetch_github_user(user)
            print(result)
        `,
    ),

    Step("return", function () {
      return this.pyStep.company;
    }),
  );
