import { Type, type } from "arktype";

export interface Scoped<Scope extends Record<any, any>> {
  scope: Scope;
}

export interface Extendable<Scope> {
  use<const NewScope>(newScope: NewScope): Extendable<NewScope & Scope>;
}

export interface Triggerable<Scope extends Record<any, any>> {
  on<const Schema>(
    on: Schema extends Type<infer Schema>
      ? Type<Schema>
      : Schema extends object
      ? type.validate<Schema>
      : object
  ): Scoped<Scope>;
}
