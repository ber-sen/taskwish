import type { CallExpression, Node, VariableStatement } from "ts-morph";

export type MorphOptions = {
  filePath?: string;
};

export type ActorBinding = {
  actorName: string;
  declaration: VariableStatement;
  dependencies: ActorDependency[];
};

export type ActorDependency = {
  identifier: string;
  scopeName: string;
};

export type ActionSpec = {
  actorName: string;
  actionName: string;
  inputType: string | null;
  actorDeclaration: VariableStatement;
  declaration: VariableStatement;
  steps: StepSpec[];
  actionDependencies: ActionDependency[];
};

export type ServiceSpec = {
  serviceName: string;
  actionNames: string[];
  actorDeclaration: VariableStatement;
  declaration: VariableStatement;
};

export type StepSpec = {
  name: string;
  propertyType: string;
  blockText: string;
  directExpressionText: string | null;
  useBreakBlock: boolean;
  usesSignal: boolean;
  usesAbortSignal: boolean;
  actionUses: ActionUse[];
};

export type ActionUse = {
  path: string[];
};

export type ActionDependency = {
  actionNames: string[];
  identifier: string;
  scopeName: string;
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
