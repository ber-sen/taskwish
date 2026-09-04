import { Provider } from "taskwish";

export const { Ollama } = Provider("Ollama", {
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
  models: ["qwen3:4b"],
});
