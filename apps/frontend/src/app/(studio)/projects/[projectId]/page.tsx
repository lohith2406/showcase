import { ProjectProgress } from "@/components/project-progress";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectProgress projectId={projectId} />;
}
