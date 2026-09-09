import { Actor, Provider } from "taskwish";

export const openAIModel = process.env.OPENAI_MODEL || "gpt-6-astra";

const { OpenAI } = Provider("OpenAI", {
  baseURL: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
  models: [openAIModel],
  supportsStructuredOutputs: true,
});

export const { actor } = Actor("LoadExtractor").use(OpenAI);
