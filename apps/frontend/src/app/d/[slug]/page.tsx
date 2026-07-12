import type { Metadata } from "next";
import { DemoPlayer } from "@/components/demo-player";
export const metadata: Metadata = { title: "Interactive product demo" };
export default async function PublicDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <DemoPlayer slug={slug} />;
}
