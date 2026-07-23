"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { loginSchema, signUpSchema } from "@/lib/schemas/auth";
import { useLogin, useSignup, useStartDemo } from "@/hooks/queries";
import { ApiClientError } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signUpSchema>;

const GENERIC_ERROR = "Something went wrong. Check your connection and try again.";

/** Reads a server-thrown ApiClientError's message, falling back to a generic one for network/parse failures. */
function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : GENERIC_ERROR;
}

/**
 * Server-error surface for both forms. `role="alert"` puts it in the
 * accessibility tree's live-region set so screen readers announce it the
 * moment a submit fails — no separate `aria-live` wiring needed.
 */
function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-5 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

/**
 * Runs the demo-session mutation and lands on the dashboard, same as the
 * marketing page's hero CTA (src/components/marketing/landing.tsx) minus the
 * signed-in branch — these pages are only ever reached signed out.
 */
function useTryDemo() {
  const router = useRouter();
  const startDemo = useStartDemo();

  function run() {
    startDemo.mutate(undefined, {
      onSuccess: () => router.push("/dashboard"),
      onError: () => {
        toast({
          title: "Couldn't start your demo",
          description: "The sandbox didn't spin up. Give it another try.",
          variant: "error",
        });
      },
    });
  }

  return { run, pending: startDemo.isPending };
}

/** Cross-link to the other auth page plus the tertiary "try the live demo" escape hatch. Shared by both forms. */
function AuthFooter({ mode }: { mode: "login" | "signup" }) {
  const { run, pending } = useTryDemo();

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <p className="text-sm text-text-2">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link href="/signup" prefetch={false} className="font-medium text-accent hover:underline">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" prefetch={false} className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
      <div className="flex w-full items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-text-3">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="ghost" size="sm" loading={pending} onClick={run}>
        {pending ? "Setting up your sandbox…" : "Try the live demo"}
      </Button>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login.mutateAsync(values);
      router.push("/dashboard");
    } catch (err) {
      setServerError(serverMessage(err));
    }
  });

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-text">Welcome back</h1>
      <p className="mt-1.5 text-sm text-text-2">Sign in to pick up your hiring pipeline where you left off.</p>
      <ErrorBanner message={serverError} />
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Username" id="login-username" error={errors.username?.message}>
          <Input {...register("username")} autoComplete="username" autoFocus />
        </Field>
        <Field label="Password" id="login-password" error={errors.password?.message}>
          <Input type="password" {...register("password")} autoComplete="current-password" />
        </Field>
        <Button type="submit" loading={login.isPending} className="mt-2 w-full">
          Sign in
        </Button>
      </form>
      <AuthFooter mode="login" />
    </>
  );
}

function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signup.mutateAsync(values);
      router.push("/dashboard");
    } catch (err) {
      setServerError(serverMessage(err));
    }
  });

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-text">Create your account</h1>
      <p className="mt-1.5 text-sm text-text-2">Set up a workspace and start tracking candidates in minutes.</p>
      <ErrorBanner message={serverError} />
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Field
          label="Username"
          id="signup-username"
          error={errors.username?.message}
          hint="3–40 characters: letters, numbers, . _ -"
        >
          <Input {...register("username")} autoComplete="username" autoFocus />
        </Field>
        <Field label="Email" id="signup-email" error={errors.email?.message}>
          <Input type="email" {...register("email")} autoComplete="email" />
        </Field>
        <Field label="Password" id="signup-password" error={errors.password?.message} hint="At least 10 characters">
          <Input type="password" {...register("password")} autoComplete="new-password" />
        </Field>
        <Button type="submit" loading={signup.isPending} className="mt-2 w-full">
          Create account
        </Button>
      </form>
      <AuthFooter mode="signup" />
    </>
  );
}

export interface AuthFormProps {
  mode: "login" | "signup";
}

/**
 * Shared entry point for `/login` and `/signup`. Dispatches to a fully
 * separate `LoginForm`/`SignupForm` (rather than branching inside one
 * component body) so each can call `useForm` unconditionally with its own
 * schema-derived type — `loginSchema`/`signUpSchema` are `.strict()`, so a
 * single shared form shape would reject whichever fields the other mode
 * doesn't have.
 */
export function AuthForm({ mode }: AuthFormProps) {
  return mode === "login" ? <LoginForm /> : <SignupForm />;
}
