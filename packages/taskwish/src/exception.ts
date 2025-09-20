export interface Exception<
  Params extends {
    status: number;
  }
> {
  exception: Params;
  throw: () => void;
  toString: () => string;
}

export const Exception = <
  const Params extends {
    status: number;
  }
>(
  exception: Params
): Exception<Params> => ({
  exception,
  throw: () => {
    throw new Error(JSON.stringify(exception));
  },
});
