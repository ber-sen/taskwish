// ── Result kind ───────────────────────────────────────────────────────────────

/**
 * Base interface for "result kinds" — HKT from (Ctx, Last) to a concrete
 * return type.
 */
export interface ResultKind {
  readonly ctx: unknown;
  readonly last: unknown;
  readonly type: unknown;
}

/** Instantiate a ResultKind with concrete (Ctx, Last). */
export type ApplyResult<F extends ResultKind, Ctx, Last> =
  (F & { readonly ctx: Ctx; readonly last: Last })["type"];

