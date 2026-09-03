"use client";

import { Github, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isDocs = pathname.startsWith("/docs");

  return (
    <header className="site-header">
      <a href="/" className="home-link"><Logo /></a>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "main-nav open" : "main-nav"} aria-label="Main navigation">
        <a href="/docs" aria-current={isDocs ? "page" : undefined}>Docs</a>
        <a href="/#examples">Examples</a>
        <a href="https://github.com/yama-otoko/taskwish" target="_blank" rel="noreferrer"><Github size={17} /> GitHub</a>
        <a className="nav-cta" href="/#install">Install <span>↗</span></a>
      </nav>
    </header>
  );
}
