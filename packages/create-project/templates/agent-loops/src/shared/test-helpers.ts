import { expect, mock } from "bun:test";
import { TW } from "taskwish";

export function expectCommandActor(
  value: unknown,
  actorName: string,
  commandName: string
): void {
  const actor = value as Record<string | symbol, unknown>;
  const command = actor[commandName] as Record<string | symbol, unknown>;

  expect(actor[TW.Name]).toBe(actorName);
  expect(typeof actor[commandName]).toBe("function");
  expect(command[TW.Name]).toBe(`${actorName}::${commandName}`);
  expect(command[TW.Meta]).toMatchObject({
    description: expect.any(String),
  });
}

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
