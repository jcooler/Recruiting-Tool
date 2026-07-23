import type { Metadata } from "next";
import { PipelineView } from "@/components/pipeline/pipeline-view";

export const metadata: Metadata = {
  title: "Candidates",
};

export default function CandidatesPage() {
  return <PipelineView />;
}
