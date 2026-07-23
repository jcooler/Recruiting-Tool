"use client";

import { useEffect, useState } from "react";
import { useController, useForm, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCandidate, useJobs, type ParseResumeResult } from "@/hooks/queries";
import { useUiStore } from "@/stores/ui";
import { ApiClientError } from "@/lib/api-client";
import type { JobDto } from "@/lib/dto";
import { createCandidateSchema } from "@/lib/schemas/candidate";
import { SOURCE_LABELS, SOURCES, STAGE_LABELS, STAGES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, TagInput } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { IconCheck } from "@/components/ui/icons";
import { ResumeDropzone } from "./resume-dropzone";

// `createCandidateSchema` already carries `resumeText` as an optional,
// length-capped string — but that field isn't one of this form's *visible*
// controls, it's a value `ResumeDropzone`'s parse success handler drops
// into form state behind the scenes (see `handleParsed` below). Re-adding
// it as a plain optional string (no length cap to re-check client-side —
// the parse endpoint already bounded it) keeps the schema honest about
// what it actually validates versus what's just carried through.
//
// `experience` has no editor here either (not in the task-27 brief's field
// list, same as EditCandidateDialog's field set) — omitted outright rather
// than left unregistered, because `z.input` of its `z.coerce.date()`
// sub-fields is `Date`, which doesn't structurally match
// `CreateCandidateInput`'s `string` dates and would otherwise fail
// `useCreateCandidate().mutateAsync(values)` at the type level even though
// the key is never actually populated.
const addCandidateSchema = createCandidateSchema
  .omit({ resumeText: true, experience: true })
  .extend({ resumeText: z.string().optional() });

// `z.input` (not `z.infer`) for the same reason as JobFormDialog's
// `JobFormValues`/EditCandidateDialog's `EditFormValues`: several fields
// carry `.optional().default(...)`, so the *output* type doesn't match what
// `zodResolver` expects for pre-validation form values.
type AddFormValues = z.input<typeof addCandidateSchema>;

const BLANK_VALUES: AddFormValues = {
  jobId: "",
  name: "",
  email: "",
  phone: "",
  location: "",
  source: SOURCES[0],
  stage: "applied",
  tags: [],
  skills: [],
  education: "",
  desiredPay: "",
  resumeText: undefined,
};

function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Try again.";
}

// Must match `trimmedString(40)`/`trimmedString(30)` on `skills`/`tags` in
// `src/lib/schemas/candidate.ts` exactly — see the identical constant in
// `edit-candidate-dialog.tsx` for why.
const SKILL_MAX_LENGTH = 40;
const TAG_MAX_LENGTH = 30;

/** Same `useController` wiring as `EditCandidateDialog`'s `TagField` — see that file's doc comment. */
function TagField({
  control,
  name,
  placeholder,
  maxItemLength,
  id,
  ...aria
}: {
  control: Control<AddFormValues>;
  name: "skills" | "tags";
  placeholder: string;
  maxItemLength: number;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const { field } = useController({ control, name });
  return (
    <TagInput
      id={id}
      value={field.value ?? []}
      onChange={field.onChange}
      placeholder={placeholder}
      maxItemLength={maxItemLength}
      {...aria}
    />
  );
}

interface CandidateFormFieldsProps {
  register: UseFormRegister<AddFormValues>;
  control: Control<AddFormValues>;
  errors: FieldErrors<AddFormValues>;
  jobs: JobDto[] | undefined;
}

/**
 * The field set shared by both tabs — rendered once under "Manual", and
 * again under "From resume" once a parse succeeds (never both at once:
 * `Tabs`/`TabsContent` only mounts the active panel). Both call sites are
 * driven by the *same* `register`/`control`/`errors` from the one
 * `useForm()` call in `AddCandidateDialog`, so switching tabs never loses
 * anything the user already typed — remounting this stateless component
 * just re-attaches inputs to form state that already exists.
 */
function CandidateFormFields({ register, control, errors, jobs }: CandidateFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Field label="Job" id="candidate-job" error={errors.jobId?.message}>
        <NativeSelect {...register("jobId")}>
          <option value="" disabled>
            Select a job…
          </option>
          {(jobs ?? []).map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Name" id="candidate-name" error={errors.name?.message}>
        <Input {...register("name")} />
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
      <Field label="Stage" id="candidate-stage" error={errors.stage?.message}>
        <NativeSelect {...register("stage")}>
          {STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Skills" id="candidate-skills" error={errors.skills?.message as string | undefined}>
        <TagField control={control} name="skills" placeholder="Add a skill" maxItemLength={SKILL_MAX_LENGTH} />
      </Field>
      <Field label="Tags" id="candidate-tags" error={errors.tags?.message as string | undefined}>
        <TagField control={control} name="tags" placeholder="Add a tag" maxItemLength={TAG_MAX_LENGTH} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Education" id="candidate-education" error={errors.education?.message}>
          <Input {...register("education")} />
        </Field>
        <Field label="Desired pay" id="candidate-desired-pay" error={errors.desiredPay?.message}>
          <Input {...register("desiredPay")} />
        </Field>
      </div>
    </div>
  );
}

/**
 * Global "Add candidate" dialog — mounted once by `AppShell` next to
 * `CandidateDrawer`, entirely driven by `useUiStore().addCandidateOpen`.
 * Every trigger (command palette, PipelineView's header button, empty
 * states) just calls `setAddCandidateOpen(true)`; this is the one place
 * that renders in response.
 *
 * Two entry paths share one form: "From resume" (default) starts at
 * `ResumeDropzone` and swaps to the field set once `useParseResume`
 * resolves, prefilling name/email/phone/skills and stashing the extracted
 * text in the hidden `resumeText` field; "Manual" starts at the field set
 * directly. A parse failure surfaces the server's 422 text inline with an
 * "Enter manually instead" escape hatch that just switches tabs — nothing
 * carries over because nothing was ever set.
 */
export function AddCandidateDialog() {
  const open = useUiStore((s) => s.addCandidateOpen);
  const setOpen = useUiStore((s) => s.setAddCandidateOpen);
  const openDrawer = useUiStore((s) => s.openDrawer);
  const jobsQuery = useJobs();
  const createCandidate = useCreateCandidate();

  const [tab, setTab] = useState<"resume" | "manual">("resume");
  const [parsed, setParsed] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddFormValues>({
    resolver: zodResolver(addCandidateSchema),
    defaultValues: BLANK_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(BLANK_VALUES);
      setTab("resume");
      setParsed(false);
    }
  }, [open, reset]);

  function handleParsed(result: ParseResumeResult) {
    setValue("name", result.fields.name ?? "");
    setValue("email", result.fields.email ?? "");
    setValue("phone", result.fields.phone ?? "");
    setValue("skills", result.fields.skills);
    setValue("resumeText", result.text);
    setParsed(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const candidate = await createCandidate.mutateAsync(values);
      toast({ title: "Candidate added", variant: "success" });
      setOpen(false);
      openDrawer(candidate.id);
    } catch (err) {
      toast({ title: "Couldn't add candidate", description: serverMessage(err), variant: "error" });
    }
  });

  // The dropzone's landing state has no visible fields to submit — disable
  // the footer's save button until either a resume has parsed or the user
  // is on the Manual tab, so there's never a submit attempt against fields
  // that aren't on screen.
  const showForm = tab === "manual" || parsed;

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Add candidate"
      description="Parse a resume or enter their details manually."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={createCandidate.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-candidate-form"
            loading={createCandidate.isPending}
            disabled={!showForm}
          >
            Add candidate
          </Button>
        </>
      }
    >
      <form id="add-candidate-form" onSubmit={onSubmit} noValidate>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "resume" | "manual")}>
          <TabsList>
            <TabsTrigger value="resume">From resume</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="resume">
            {parsed ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
                  <IconCheck size={15} />
                  Parsed from resume — review before saving
                </div>
                <CandidateFormFields register={register} control={control} errors={errors} jobs={jobsQuery.data} />
              </div>
            ) : (
              <ResumeDropzone onParsed={handleParsed} onEnterManually={() => setTab("manual")} />
            )}
          </TabsContent>
          <TabsContent value="manual">
            <CandidateFormFields register={register} control={control} errors={errors} jobs={jobsQuery.data} />
          </TabsContent>
        </Tabs>
      </form>
    </Dialog>
  );
}
