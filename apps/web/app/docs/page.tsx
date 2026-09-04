import type { Metadata } from "next";
import { Docs } from "../../src/docs";

export const metadata: Metadata = {
  title: "Getting started",
  description: "Create and run a local TaskWish service.",
};

export default function DocsIndexPage() {
  return <Docs slug="getting-started" />;
}
