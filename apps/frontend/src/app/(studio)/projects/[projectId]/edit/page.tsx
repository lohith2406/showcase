import type { Metadata } from "next";
import { DemoEditor } from "@/components/demo-editor";
export const metadata: Metadata = { title: "Demo editor" };
export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <DemoEditor projectId={projectId} />;
}
