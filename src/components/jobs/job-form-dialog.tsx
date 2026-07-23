"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ApiClientError } from "@/lib/api-client";
import type { JobDto } from "@/lib/dto";
import { useCreateJob, useUpdateJob } from "@/hooks/queries";
import { createJobSchema } from "@/lib/schemas/job";
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";

// `z.input` (not `z.infer`/`z.output`) — `description`/`status` carry
// `.optional().default(...)`, so the *output* type (post-default) makes
// them required, which doesn't match what `zodResolver` expects for a
// form's pre-validation field values.
type JobFormValues = z.input<typeof createJobSchema>;

const BLANK_VALUES: JobFormValues = {
  title: "",
  department: "",
  location: "",
  employmentType: "full-time",
  description: "",
  status: "open",
};

function valuesFromJob(job: JobDto): JobFormValues {
  return {
    title: job.title,
    department: job.department,
    location: job.location,
    employmentType: job.employmentType,
    description: job.description,
    status: job.status,
  };
}

export interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present in edit mode; omitted opens the dialog in create mode. */
  job?: JobDto;
}

/**
 * Create/edit dialog for a job requisition. `job`'s presence switches the
 * mode — create POSTs a new job, edit PATCHes the existing one — sharing
 * one form body and one `createJobSchema` resolver for both. The dialog
 * stays mounted across opens (its parent just flips `open`), so the form
 * is reseeded from `job` (or blanked) every time it transitions to open,
 * rather than only on first mount.
 */
export function JobFormDialog({ open, onOpenChange, job }: JobFormDialogProps) {
  const isEdit = Boolean(job);
  const createJob = useCreateJob();
  const updateJob = useUpdateJob(job?.id ?? "");
  const pending = createJob.isPending || updateJob.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: BLANK_VALUES,
  });

  useEffect(() => {
    if (open) reset(job ? valuesFromJob(job) : BLANK_VALUES);
  }, [open, job, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (job) {
        await updateJob.mutateAsync(values);
        toast({ title: "Job updated", variant: "success" });
      } else {
        await createJob.mutateAsync(values);
        toast({ title: "Job created", variant: "success" });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: isEdit ? "Couldn't update job" : "Couldn't create job",
        description: err instanceof ApiClientError ? err.message : "Something went wrong. Try again.",
        variant: "error",
      });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit job" : "New job"}
      description={isEdit ? "Update this role's details." : "Add a role to start tracking candidates against it."}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="job-form" loading={pending}>
            {isEdit ? "Save changes" : "Create job"}
          </Button>
        </>
      }
    >
      <form id="job-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Job title" id="job-title" error={errors.title?.message}>
          <Input {...register("title")} autoFocus />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Department" id="job-department" error={errors.department?.message}>
            <Input {...register("department")} />
          </Field>
          <Field label="Location" id="job-location" error={errors.location?.message}>
            <Input {...register("location")} />
          </Field>
        </div>
        <Field label="Employment type" id="job-employment-type" error={errors.employmentType?.message}>
          <NativeSelect {...register("employmentType")}>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {EMPLOYMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field
          label="Description"
          id="job-description"
          error={errors.description?.message}
          hint="Optional — visible to your team, not candidates."
        >
          <Textarea {...register("description")} rows={5} />
        </Field>
      </form>
    </Dialog>
  );
}
