import type { Metadata } from "next";
import { JobHeader } from "@/components/jobs/job-header";
import { PipelineView } from "@/components/pipeline/pipeline-view";

export const metadata: Metadata = {
  title: "Job",
};

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <JobHeader jobId={jobId} />
      <PipelineView jobId={jobId} />
    </div>
  );
}
