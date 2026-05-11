import { Actor, Step } from "../../src";
import { py, Exec } from "./exec";

const { MyActor } = Actor("MyActor");

export const { runPython } = MyActor()
  .on("Command", "runPython")

  .run(
    Step("baseUrl", function () {
      return "https://api.github.com/users/";
    }),

    Exec.Step(
      "pyStep",

      py`
        import requests

        def step(baseUrl):
            url = f"{baseUrl}/{username}"
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
      `,
      {
        runtime: "python",
        install: ["requests"],
        arg0: (ctx) => ["string", ctx.baseUrl],
        output: {
          name: "string",
          company: "string",
          public_repos: "string",
          followers: "number",
        },
      },
    ),

    Step("return", function () {
      return this.pyStep.company;
    }),
  );
