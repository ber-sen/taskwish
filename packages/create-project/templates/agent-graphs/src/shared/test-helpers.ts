import { mock } from "bun:test";

export function mockAgent(...responses: string[]) {
  const generate = mock(async () => {
    const response = responses.shift();
    if (response === undefined) {
      throw new Error("The mock agent has no response left.");
    }
    return response;
  });

  return { generate };
}
