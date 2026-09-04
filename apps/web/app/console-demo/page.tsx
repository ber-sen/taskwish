import type { Metadata } from "next";
import { Console } from "@taskwish/console/react";
import "@taskwish/console/styles.css";
import { consoleDemoConfig } from "../../src/console-demo-config";

export const metadata: Metadata = {
  title: "TaskWish Console preview",
  robots: { index: false, follow: false },
};

export default function ConsoleDemoPage() {
  return (
    <div className="console-demo-page">
      <style>{`
        body:has(.console-demo-page) > header,
        body:has(.console-demo-page) > footer { display: none; }
        .console-demo-page > main { padding-top: 6rem; }
        body:has(.console-demo-page) { --primary-foreground: 0 0% 100%; color-scheme: light; }
        body:has(.console-demo-page) button.bg-primary,
        body:has(.console-demo-page) button.bg-black,
        body:has(.console-demo-page) button[type="submit"],
        body:has(.console-demo-page) button[data-state="on"] { color: #fff !important; }
        body:has(.console-demo-page) .is-user .text-primary-foreground { color: #fff !important; }
        body:has(.console-demo-page) pre { color: #111 !important; }
        body:has(.console-demo-page) select,
        body:has(.console-demo-page) select option { background: #fff !important; color: #111 !important; }
        body:has(.console-demo-page) input[type="checkbox"] { accent-color: #111; background: #fff; }
      `}</style>
      <Console
        config={consoleDemoConfig}
        autoFocus={false}
        showMcpServer
      />
    </div>
  );
}
