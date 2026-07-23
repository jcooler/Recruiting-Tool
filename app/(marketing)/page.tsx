import { Landing } from "@/components/marketing/landing";

/**
 * The public marketing home page — lives in a route group so its URL is
 * still `/`, but it sits outside `app/(app)` and is never wrapped by
 * `AuthGate`: this is the one page a signed-out visitor must always be able
 * to load. `Landing` itself is a client component (it reads session state
 * via `useMe` and drives the demo-start mutation), so this wrapper stays a
 * server component to avoid growing the client boundary any further than
 * it needs to be.
 */
export default function MarketingHomePage() {
  return <Landing />;
}
