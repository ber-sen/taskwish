import { CopyButton } from "./copy-button";

export function CodeBlock({ code, title = "taskwish.ts", language = "ts" }: { code: string; title?: string; language?: string }) {
  return (
    <div className="code-window">
      <div className="code-bar"><span><i />{title}</span><CopyButton value={code} label="Copy code" /></div>
      <pre data-language={language}><code>{code}</code></pre>
    </div>
  );
}
