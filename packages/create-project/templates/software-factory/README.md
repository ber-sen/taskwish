# TaskWish software factory

A GitHub-triggered software workflow with two AI actors and a Slack integration:

```text
GitHub issues webhook
        │
        ▼
GitHub::IssueOpened
        │
        ▼
CodingAgent
        │
        ▼
CodingAgent::ChangeProposed
        │
        ▼
ReviewAgent ──────▶ Slack.postMessage
        │
        ▼
ReviewAgent::ChangeReviewed
```

The GitHub actor converts an external webhook into a typed event. `CodingAgent`
subscribes and proposes an implementation. `ReviewAgent` subscribes to that
proposal, reviews it, posts the result to Slack, and emits a final event.

The two agents never call each other directly. Events carry the work between
actors, while Slack is used as a normal injected actor action.

## Run locally

```sh
bun install
ollama pull qwen3:4b
ollama serve
TW_SLACK_API_KEY=xoxb-your-token \
SLACK_CHANNEL_ID=C0123456789 \
bun start
```

Configure a GitHub `issues` webhook to send `POST` requests to
`/integrations/github/issues` with the TaskWish API key printed at startup. An
`opened` issue starts the complete chain.

Set `OLLAMA_BASE_URL` to use another OpenAI-compatible Ollama endpoint. Unit
tests inject mock agents and a mock Slack action, so they need no credentials or
model server:

```sh
bun test
```

To run the application on Node.js 20+, use `npm install` followed by
`npm run start:node`. Tests continue to use Bun's built-in test runner.
