import { expect, test } from "bun:test";

import { Emails } from ".";

test("converts decoded email text to Markdown", async () => {
  expect(await Emails.readEmail({ body: "  Book BOL-1042  " })).toEqual({
    markdown: "Email body:\nBook BOL-1042",
  });
});

test("rejects empty and oversized email text", async () => {
  await expect(Emails.readEmail({ body: " " })).rejects.toThrow("1–120,000");
  await expect(
    Emails.readEmail({ body: "a".repeat(120_001) })
  ).rejects.toThrow("1–120,000");
});
