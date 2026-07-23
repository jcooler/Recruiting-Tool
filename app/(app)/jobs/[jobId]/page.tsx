import type { Metadata } from "next";
import { JobHeader } from "@/components/jobs/job-header";

export const metadata: Metadata = {
  title: "Job",
};

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <JobHeader jobId={jobId} />
      {/*
        Task 24 seam: the embedded pipeline board mounts directly below the
        header — `<PipelineView jobId={jobId} />`. Intentionally not built
        here; this task only ships the header + stage-count strip shell.
      */}
    </div>
  );
}
