export interface StepDef {
  /** Action / function to invoke, e.g. `"generateText"` or `"Slack.sendMessage"` */
  $: string;
  /** Variable name bound to this step's result */
  "=": string;
  [key: string]: unknown;
}

export interface BehaviorDef {
  /** Trigger type: `"Command"`, `"NewEmail"`, `"Schedule"`, etc. */
  ">": string;
  /** For `"Command"` behaviors — the command name (defaults to `"run"`) */
  "="?: string;
  run?: StepDef[];
}

export interface ActorDef {
  $: "Actor";
  /** Actor name in PascalCase, e.g. `"SneakyConductor"` */
  "=": string;
  color?: string;
  behaviors?: BehaviorDef[];
}
