import { Last } from "./steps";

export interface SubStep {
  <
    Ctx extends Record<any, any>,
    Name extends "launchApp" | "scrollUntilVisible" | "tapOn" | "scroll",
  >(
    name: Name,
    options?: any
  ): {
    step: (ctx: Ctx) => Name extends string
      ? {
          scope: Ctx["scope"] &
            Record<
              Name,
              "if" extends keyof Ctx["scope"] ? boolean | undefined : boolean
            >;
          [Last]: boolean;
        }
      : Ctx;
  };
}
export interface OptionSubSteps {
  <Ctx extends Record<any, any>, Options, A>(
    options: (scope: Ctx["scope"]) => Options,
    step: {
      step: (input: Ctx) => A;
    }
  ): {
    step: (input: Ctx) => A;
  };
  <Ctx extends Record<any, any>, Options, A, B>(
    options: (scope: Ctx["scope"]) => Options,
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    }
  ): {
    step: (input: Ctx) => B;
  };
  <Ctx extends Record<any, any>, Options, A, B, C>(
    options: (scope: Ctx["scope"]) => Options,
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    },
    step3: {
      step: (input: B) => C;
    }
  ): {
    step: (input: Ctx) => C & Record<"options", Options>;
  };
}

export interface SubSteps {
  <Ctx extends Record<any, any>, A>(step: {
    step: (input: Ctx) => A;
  }): {
    step: (input: Ctx) => A;
  };
  <Ctx extends Record<any, any>, A, B>(
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    }
  ): {
    step: (input: Ctx) => B;
  };
  <Ctx extends Record<any, any>, A, B, C>(
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    },
    step3: {
      step: (input: B) => C;
    }
  ): {
    step: (input: Ctx) => C;
  };
  <Ctx extends Record<any, any>, A, B, C, D>(
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    },
    step3: {
      step: (input: B) => C;
    },
    step4: {
      step: (input: C) => D;
    }
  ): {
    step: (input: Ctx) => D;
  };
  <Ctx extends Record<any, any>, A, B, C, D, E>(
    step1: {
      step: (input: Ctx) => A;
    },
    step2: {
      step: (input: A) => B;
    },
    step3: {
      step: (input: B) => C;
    },
    step4: {
      step: (input: C) => D;
    },
    step5: {
      step: (input: C) => D;
    },
    step6: {
      step: (input: D) => E;
    }
  ): {
    step: (input: Ctx) => E;
  };
}
