import { Actor, Step } from "../../src";
import { py, Shell } from "./shell";

const { MyActor } = Actor("MyActor");

export const { runPython } = MyActor()
  .on("Command", "runPython")

  .run(
    Step("baseUrl", function () {
      return "https://api.github.com/users/";
    }),

    Shell.Step(
      "pyStep",

      {
        runtime: "python",
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
