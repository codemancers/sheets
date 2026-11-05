/** A failed check, as Standard Schema reports it. */
export type StandardSchemaV1Issue = {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
};

export type StandardSchemaV1Result<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardSchemaV1Issue> };

/**
 * The Standard Schema interface (https://standardschema.dev), copied here as
 * the spec intends so the package takes no validation dependency. zod 3.24+,
 * Valibot, ArkType and Yup schemas implement it: pass the schema itself.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) =>
      StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
    readonly types?:
      { readonly input: Input; readonly output: Output } | undefined;
  };
}

/**
 * Validation rule for an editable cell: any Standard Schema. A failure is
 * reported on the cell with the first issue's message.
 */
export type SheetCellValidator = StandardSchemaV1;

/**
 * What an editable cell's `onCommit` reports back. `void`, or no `error`, is
 * success. An `error` is shown on the cell the way a refused value is: the
 * typed value stays on screen, so it can be fixed and retried.
 */
export type CellCommitResult = void | { error?: string };
