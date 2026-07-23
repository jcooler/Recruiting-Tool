"use client";

import { useEffect } from "react";
import { useController, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useUpdateCandidate } from "@/hooks/queries";
import { ApiClientError } from "@/lib/api-client";
import type { CandidateDto } from "@/lib/dto";
import { updateCandidateSchema } from "@/lib/schemas/candidate";
import { SOURCE_LABELS, SOURCES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, TagInput } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";

// `z.input` (not `z.infer`) for the same reason as JobFormDialog's
// `JobFormValues`: the schema's array fields carry `.optional().default([])`
// upstream of `.partial()`, so the *output* type doesn't match what
// `zodResolver` expects for pre-validation form values. Only the fields this
// dialog actually edits are picked — `experience` has no editor here (not
// in the task-26 brief's field list), and omitting it from `defaultValues`
// keeps it out of the submitted payload entirely rather than risking it
// being sent as `[]` (verified: `updateCandidateSchema`'s `.partial()` does
// NOT inject an `experience: []` default for a key that's simply absent —
// the outer `.optional()` from `.partial()` short-circuits before the
// inner `.default([])` ever runs).
type EditFormValues = Pick<
  z.input<typeof updateCandidateSchema>,
  "name" | "email" | "phone" | "location" | "source" | "education" | "desiredPay" | "skills" | "tags"
>;

function valuesFromCandidate(candidate: CandidateDto): EditFormValues {
  return {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone ?? "",
    location: candidate.location ?? "",
    source: candidate.source,
    education: candidate.education ?? "",
    desiredPay: candidate.desiredPay ?? "",
    skills: candidate.skills,
    tags: candidate.tags,
  };
}

function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Try again.";
}

/**
 * `TagInput` is a controlled value/onChange pair, not a native form
 * element, so it's wired through `useController` rather than `register()`
 * (see JobFormDialog for the register() baseline this dialog otherwise
 * matches). This wrapper is `Field`'s direct child, so it re-declares and
 * forwards `id`/`aria-invalid`/`aria-describedby` — `Field`'s `cloneElement`
 * only reaches its immediate child, and the actual input those props need
 * to land on is one level down, inside `TagInput`.
 */
function TagField({
  control,
  name,
  placeholder,
  id,
  ...aria
}: {
  control: Control<EditFormValues>;
  name: "skills" | "tags";
  placeholder: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const { field } = useController({ control, name });
  return <TagInput id={id} value={field.value ?? []} onChange={field.onChange} placeholder={placeholder} {...aria} />;
}

export interface EditCandidateDialogProps {
  candidate: CandidateDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edits the candidate fields the task-26 brief lists (name, email, phone,
 * location, source, education, desired pay, skills, tags) via
 * `updateCandidateSchema` + `useUpdateCandidate`. Always in "edit" mode —
 * unlike `JobFormDialog`, there's no create path here (that's the separate
 * Add candidate flow); `candidate` is a required prop, not optional.
 */
export function EditCandidateDialog({ candidate, open, onOpenChange }: EditCandidateDialogProps) {
  const updateCandidate = useUpdateCandidate(candidate.id);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(updateCandidateSchema),
    defaultValues: valuesFromCandidate(candidate),
  });

  useEffect(() => {
    if (open) reset(valuesFromCandidate(candidate));
  }, [open, candidate, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateCandidate.mutateAsync(values);
      toast({ title: "Candidate updated", variant: "success" });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Couldn't update candidate", description: serverMessage(err), variant: "error" });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit candidate"
      description="Update this candidate's profile."
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={updateCandidate.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="edit-candidate-form" loading={updateCandidate.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-candidate-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Name" id="candidate-name" error={errors.name?.message}>
          <Input {...register("name")} autoFocus />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" id="candidate-email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>
          <Field label="Phone" id="candidate-phone" error={errors.phone?.message}>
            <Input {...register("phone")} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Location" id="candidate-location" error={errors.location?.message}>
            <Input {...register("location")} />
          </Field>
          <Field label="Source" id="candidate-source" error={errors.source?.message}>
            <NativeSelect {...register("source")}>
              {SOURCES.map((source) => (
                <option key={source} value={source}>
                  {SOURCE_LABELS[source]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Education" id="candidate-education" error={errors.education?.message}>
            <Input {...register("education")} />
          </Field>
          <Field label="Desired pay" id="candidate-desired-pay" error={errors.desiredPay?.message}>
            <Input {...register("desiredPay")} />
          </Field>
        </div>
        <Field label="Skills" id="candidate-skills" error={errors.skills?.message as string | undefined}>
          <TagField control={control} name="skills" placeholder="Add a skill" />
        </Field>
        <Field label="Tags" id="candidate-tags" error={errors.tags?.message as string | undefined}>
          <TagField control={control} name="tags" placeholder="Add a tag" />
        </Field>
      </form>
    </Dialog>
  );
}
