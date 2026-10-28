/**
 * Validation rule for an editable cell — anything with zod's `safeParse` shape.
 *
 * Structural on purpose: the package takes no zod dependency and knows nothing
 * about any domain, while a zod schema satisfies this as-is. `value` is
 * `unknown`, so this works for a numeric or date cell exactly as it does for
 * text.
 */
export type SheetCellValidator = {
  safeParse: (
    value: unknown,
  ) =>
    | { success: true }
    | { success: false; error?: { issues?: readonly { message?: string }[] } };
};
