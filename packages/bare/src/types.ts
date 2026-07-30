import type { CallExpression, Node, VariableStatement } from "ts-morph";

export type MorphOptions = {
  filePath?: string;
};

export type ActorBinding = {
  actorName: string;
  declaration: VariableStatement;
};

export type ActionSpec = {
  actorName: string;
  actionName: string;
  inputType: string | null;
  actorDeclaration: VariableStatement;
  declaration: VariableStatement;
  steps: StepSpec[];
};

export type StepSpec = {
  name: string;
  propertyType: string;
  blockText: string;
  directExpressionText: string | null;
  useBreakBlock: boolean;
};

export type FunctionReturnInfo = {
  propertyType: string;
  shouldAwait: boolean;
};

export type TextEdit = {
  start: number;
  end: number;
  text: string;
};

export type CallChainItem = {
  call: CallExpression;
  methodName: string;
  receiver: Node;
};
