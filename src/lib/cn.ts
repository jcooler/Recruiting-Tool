/** Joins truthy class-name fragments with a space. No de-duping/merging — kept intentionally tiny. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
