export interface Meta<
  Params extends {
    type: string;
  }
> {
  meta: Params;
  toString: () => string;
}

export const Meta = <
  const Params extends {
    type: string;
  }
>(
  meta: Params
): Meta<Params> => ({
  meta,
  toString: () => JSON.stringify(meta),
});
