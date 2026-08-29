---
name: taskwish
description: Build or modify TypeScript TaskWish projects involving actors, actions, state, events, services, or multi-actor workflows.
---

# TaskWish

Keep `taskwish.ts` as the runnable project entrypoint. Organize each actor under `src/<actor-name>/` with its actor definition, one file per action, and an `index.ts` service export.

An actor owns its domain state and commands. Coordinate workflows across actors through a dedicated actor that declares dependencies with `.use(...)` and calls them through `this.actions.<service>.<action>`.

Define public actions with `.on("Command", "actionName")`. Add `.input(...)` when the action accepts input, and use `Step(...)` when named execution stages make the flow clearer. Let `State.List` generate primary IDs instead of supplying them when inserting records.

Format fluent action definitions with a blank line between the `.on(...)`, `.input(...)`, and `.run(...)` sections.

Update `taskwish.ts` when a runnable scenario helps demonstrate a changed workflow. Run `bun run check` after changing actor contracts and `bun start` to verify the project behavior.
