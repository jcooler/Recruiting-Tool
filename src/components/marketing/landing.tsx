"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe, useStartDemo } from "@/hooks/queries";
import { toast } from "@/components/ui/toast";
import { Button, buttonClasses } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StageBadge } from "@/components/ui/stage-badge";
import { StarRating } from "@/components/ui/star-rating";
import {
  IconArrowRight,
  IconBoard,
  IconChart,
  IconContrast,
  IconSearch,
  IconShield,
  IconUpload,
  type IconProps,
} from "@/components/ui/icons";

// ---------------------------------------------------------------------------
// Static, decorative content — the pipeline mock and feature grid never
// change at runtime, so they're plain data declared once at module scope
// rather than recreated on every render.
// ---------------------------------------------------------------------------

interface MockCandidate {
  name: string;
  seed: string;
  rating: number;
}

interface MockColumn {
  stage: "applied" | "screening" | "interview" | "offer" | "hired";
  candidates: MockCandidate[];
}

const PIPELINE_MOCK: MockColumn[] = [
  {
    stage: "applied",
    candidates: [
      { name: "Priya Desai", seed: "priya-desai", rating: 0 },
      { name: "Marcus Webb", seed: "marcus-webb", rating: 0 },
    ],
  },
  {
    stage: "screening",
    candidates: [{ name: "Elena Cruz", seed: "elena-cruz", rating: 3 }],
  },
  {
    stage: "interview",
    candidates: [
      { name: "Sam O'Neal", seed: "sam-oneal", rating: 4 },
      { name: "Dana Kessler", seed: "dana-kessler", rating: 4 },
    ],
  },
  {
    stage: "offer",
    candidates: [{ name: "Rin Tanaka", seed: "rin-tanaka", rating: 5 }],
  },
  {
    stage: "hired",
    candidates: [{ name: "Jules Ferreira", seed: "jules-ferreira", rating: 5 }],
  },
];

interface Feature {
  icon: (props: IconProps) => React.JSX.Element;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: IconBoard,
    title: "Pipeline board",
    description: "Drag every candidate from Applied to Hired on one board. Stage counts update the moment someone moves.",
  },
  {
    icon: IconUpload,
    title: "Resume parsing",
    description: "Drop in a PDF or Word résumé. Name, contact details, and skills come out the other side — no retyping.",
  },
  {
    icon: IconChart,
    title: "Analytics",
    description: "Time-in-stage, source performance, and hiring velocity charted automatically, per role or across the team.",
  },
  {
    icon: IconShield,
    title: "Role-based security",
    description: "Admins, recruiters, and interviewers each see exactly what their role allows — nothing more.",
  },
  {
    icon: IconSearch,
    title: "Command palette",
    description: "Press ⌘K to jump to any job, candidate, or page without ever reaching for the mouse.",
  },
  {
    icon: IconContrast,
    title: "Light & dark",
    description: "Every screen is designed for both themes from the ground up, not patched on after the fact.",
  },
];

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
        AW
      </span>
      <span className="text-sm font-semibold tracking-tight text-text">ApplicantWizard</span>
    </Link>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur supports-backdrop-filter:bg-surface/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Wordmark />
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <Link href="/login" prefetch={false} className={buttonClasses("ghost", "sm")}>
            Sign in
          </Link>
          <Link href="/signup" prefetch={false} className={buttonClasses("primary", "sm")}>
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero + pipeline mock
// ---------------------------------------------------------------------------

/**
 * Drives the primary CTA. Three states:
 *  - signed in (`useMe` resolves): "Open dashboard", a plain navigation.
 *  - signed out, idle: "View Live Demo", starts the demo-session mutation.
 *  - signed out, pending: "Setting up your sandbox…", button disabled.
 * The demo session cookie is set server-side by `/api/demo/start`; once the
 * mutation resolves we invalidate `me` (see `useStartDemo`) and push to the
 * dashboard the new session unlocks.
 */
function useHeroCta() {
  const router = useRouter();
  const { data: me, isSuccess: signedIn } = useMe();
  const startDemo = useStartDemo();

  function handlePrimaryClick() {
    if (signedIn) {
      router.push("/dashboard");
      return;
    }
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

  const label = signedIn ? "Open dashboard" : startDemo.isPending ? "Setting up your sandbox…" : "View Live Demo";

  return { me, signedIn, label, loading: startDemo.isPending, handlePrimaryClick };
}

function Hero() {
  const { signedIn, label, loading, handlePrimaryClick } = useHeroCta();

  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Applicant tracking system</p>
        <h1 className="mt-4 text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-text sm:text-5xl md:text-6xl">
          The pipeline your hiring team will actually keep up to date.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-text-2">
          ApplicantWizard tracks every candidate from applied to hired on one board, parses résumés the moment they
          land, and shows exactly where each role stands — no spreadsheet exports, no status meetings.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="md" className="h-11 px-6 text-base" loading={loading} onClick={handlePrimaryClick}>
            {label}
            {!loading && <IconArrowRight size={16} />}
          </Button>
          {!signedIn && (
            <Link href="/signup" prefetch={false} className={buttonClasses("secondary", "md", "h-11 px-6 text-base")}>
              Create free account
            </Link>
          )}
        </div>
        <p className="mt-3 text-xs text-text-3">No credit card. Live sandbox, seeded with real-looking data.</p>
      </div>

      <PipelineMock />
    </section>
  );
}

/**
 * The product's signature visual: a stylized snapshot of the pipeline board
 * built from the real `StageBadge`, `Avatar`, and `StarRating` components —
 * static mock data, never fetched, and `aria-hidden` since it's decorative
 * (the text above already states everything a screen reader user needs).
 * The fake window chrome (traffic-light dots + title bar) frames it as a
 * product surface rather than an abstract illustration.
 */
function PipelineMock() {
  return (
    <div className="mt-14 overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.03)]" aria-hidden="true">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/50" />
        <span className="ml-2 text-xs font-medium text-text-3">ApplicantWizard — Senior Product Designer</span>
      </div>
      <div className="grid min-w-205 grid-cols-5 gap-3 p-4">
        {PIPELINE_MOCK.map((column) => (
          <div key={column.stage} className="flex min-w-0 flex-col gap-2">
            <StageBadge stage={column.stage} className="self-start" />
            <div className="flex flex-col gap-2">
              {column.candidates.map((c) => (
                <div key={c.seed} className="rounded-lg border border-border bg-bg p-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar seed={c.seed} name={c.name} size={24} />
                    <span className="truncate text-xs font-medium text-text">{c.name}</span>
                  </div>
                  {c.rating > 0 && <StarRating value={c.rating} readOnly className="mt-1.5 scale-90 origin-left" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature grid
// ---------------------------------------------------------------------------

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon size={20} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-text-2">{description}</p>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="border-t border-border bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text">Everything a hiring team needs, nothing extra.</h2>
          <p className="mt-3 text-base text-text-2">
            Built for the day-to-day of running a hiring process — not a spreadsheet with extra steps.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <Wordmark />
          <p className="mt-2 max-w-sm text-sm text-text-3">
            Applicant tracking for teams who’d rather be interviewing than untangling email threads.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link href="#features" className="text-text-2 transition-colors hover:text-text">
            Features
          </Link>
          <Link href="/login" prefetch={false} className="text-text-2 transition-colors hover:text-text">
            Sign in
          </Link>
          <Link href="/signup" prefetch={false} className="text-text-2 transition-colors hover:text-text">
            Get started
          </Link>
        </div>
      </div>
      <div className="border-t border-border px-5 py-5 text-center text-xs text-text-3 sm:px-8">
        © {new Date().getFullYear()} ApplicantWizard. All rights reserved.
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------

export function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main>
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
