/** Joins the truthy class names. Covers every way the components build theirs. */
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
