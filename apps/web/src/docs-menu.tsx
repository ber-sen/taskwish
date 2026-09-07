"use client";

import { BookOpen, Menu, X } from "lucide-react";
import { useState } from "react";

export function DocsMenu({ pages, activeSlug }: { pages: Array<{ slug: string; title: string }>; activeSlug: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="docs-menu-button" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />} Contents</button>
    <aside className={open ? "docs-sidebar open" : "docs-sidebar"}>
      <div className="docs-label"><BookOpen size={16} /> Documentation</div>
      <nav>{pages.map((item) => <a key={item.slug} className={item.slug === activeSlug ? "active" : ""} href={`/docs/${item.slug}`}>{item.title}</a>)}</nav>
      <div className="docs-help"><span>Need a working example?</span><a href="https://github.com/yama-otoko/taskwish/tree/main/packages/create-project/templates" target="_blank" rel="noreferrer">Browse the starters ↗</a></div>
    </aside>
  </>;
}
