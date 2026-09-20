import { ClueWorkspace } from "@/app/components/ClueWorkspace";

/**
 * The route entry point.
 *
 * Deliberately a shell: the interactive work lives in ClueWorkspace, which is
 * a client component. Keeping the route itself a server component means Next
 * can prerender the page, and the "use client" boundary sits at the one place
 * where interactivity actually starts.
 */
export default function Page() {
  return <ClueWorkspace />;
}
