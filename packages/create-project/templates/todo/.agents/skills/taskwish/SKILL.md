---
name: taskwish
description: Build or modify TypeScript TaskWish projects involving actors, actions, state, events, services, or multi-actor workflows.
---

# TaskWish

Keep `taskwish.ts` as the runnable project entrypoint. Organize each actor under `src/<actor-name>/` with its actor definition, one file per action, and an `index.ts` service export.

An actor owns its domain state and commands. Coordinate workflows across actors through a dedicated actor that declares dependencies with `.use(...)` and calls them through `this.actions.<service>.<action>`.

Define public actions with `.on("Command", "actionName")`. Give command names enough domain context to stand on their own: prefer verb-and-noun names such as `addTodo`, `scheduleTodoReminder`, or `createCustomer` over vague names such as `add`, `record`, or `process`. Add `.input(...)` when the action accepts input. Add `.meta(...)` to public commands so Console users can understand them: provide a concise `description`, and add `input` descriptions and examples when fields need guidance. Use lower camelCase names for every `Step(...)`, such as `validateInput` or `createCustomer`. Prefer multiple focused steps when an action has distinct phases or coordinates a workflow, and access earlier results through `this.<stepName>`. Keep truly atomic actions as one step instead of adding artificial stages. Let `State.List` generate primary IDs instead of supplying them when inserting records.

Format fluent action definitions with a blank line between the `.on(...)`, `.input(...)`, `.run(...)`, and `.meta(...)` sections.

Add Bun unit tests for public command behavior and multi-actor workflows. For stateful actors, point `TW_DEFAULT_STORE_PATH` to a temporary directory before dynamically importing the actors, then restore the environment and remove the directory after the test so state cannot leak between runs.

Update `taskwish.ts` when a runnable scenario helps demonstrate a changed workflow. Run `bun run check` and `bun test` after changing actor contracts, and run `bun start` to verify the project behavior.
