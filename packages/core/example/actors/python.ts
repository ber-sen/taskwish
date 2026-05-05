import { Actor, Step, TW } from "../../src";
import { InferSchema, ValidateSchema } from "../../src/helpers";

const { MyActor } = Actor("MyActor");

const Python = {
  Step: <Ctx extends Record<any, any>, Name extends string, Result>(
    name: Name,
    options: {
      output?: ValidateSchema<Result>;
      import?: string[];
      run: (ctx: TW.Scope<Ctx["scope"]>) => string | string;
    },
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

export const { handle } = MyActor()
  .on("Command", "handle")

  .run(
    Step("baseUrl", function () {
      return "https://api.github.com/users/";
    }),

    Python.Step("pyStep", {
      import: ["requests"],
      output: {
        name: "string",
        company: "string",
        public_repos: "string",
        followers: "number",
      },
      run: (ctx) => `
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
    }),

    Step("return", function () {
      return this.pyStep.company;
    }),
  );
