"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="copy-button" onClick={copy} aria-label={`${label}: ${value}`}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
