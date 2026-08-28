import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { signalPayloadLine, TraceLine } from "./action-result";

describe("signal trace formatting", () => {
  test("uses the wire signal marker and unwraps protocol data", () => {
    expect(
      signalPayloadLine({
        "->": "Greeter::Message",
        data: { name: "Ada" },
      })
    ).toBe("-> Message { name: Ada }");
  });

  test("emphasizes signal and result markers and dims tree branches", () => {
    const markup = renderToStaticMarkup(
      createElement(TraceLine, { line: "│ ├─ -> Message └─ ✓ Done" })
    );

    expect(markup).toContain(
      'class="text-muted-foreground opacity-50">│</span>'
    );
    expect(markup).toContain(
      'class="text-muted-foreground opacity-50">├─</span>'
    );
    expect(markup).toContain('class="font-bold">-&gt;</span>');
    expect(markup).toContain('class="font-bold">✓</span>');
    expect(markup).toContain(
      'class="text-muted-foreground opacity-50">└─</span>'
    );
  });

  test("keeps flat signal payloads intact", () => {
    expect(
      signalPayloadLine({
        "->": "Greeter::Message",
        name: "Ada",
      })
    ).toBe("-> Message { name: Ada }");
  });
});
