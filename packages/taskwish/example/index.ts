import { Exception, Meta } from "../dist";
import {
  Action,
  Agent,
  Env,
  Infra,
  Package,
  Step,
  UseCase,
} from "../src";

Steps(
  ["step 1", () => 3],

  ["step 2", (scope) => scope]
);

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

const app = Package("My Awesome app")
  .infras(infra)
  .usecases(useCase)
  .tools()
  .actions()
  .agents(agent)
  .pages(home);

app.up();
app.down();
app.cli();
app.listen(3000);
app.mcp();
app.run("useCase");
app.chat();

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
