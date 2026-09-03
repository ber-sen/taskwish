import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Docs } from "../../../src/docs";
import { docPages } from "../../../src/doc-meta";

export function generateStaticParams() {
  return docPages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = docPages.find((item) => item.slug === slug);
  if (!page) return {};
  return { title: page.title, description: page.description };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!docPages.some((page) => page.slug === slug)) notFound();
  return <Docs slug={slug} />;
}
