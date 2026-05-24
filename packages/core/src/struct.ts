import { type Constructor, type array, type conform } from "@ark/util";

import { distill, type Type as ArkType, type } from "arktype";
import { Append, PascalCase, Pretty } from "./helpers";
import { TW } from "./core";
import {
  ArgTwoOperator,
  IndexZeroOperator,
  TupleInfixOperator,
} from "arktype/internal/parser/tupleExpressions.ts";

import {
  type Morph,
  type NodeSelector,
  type Predicate,
  type TypeMeta,
} from "@ark/schema";

export function Desc(
  strings: TemplateStringsArray,
  ...values: any[]
): "string" {
  return strings.join("") as never;
}

export type Unwrap<T> =
  T extends TW.Struct<any, infer Shape>
    ? Shape
    : T extends readonly (infer U)[]
      ? Unwrap<U>[]
      : T extends object
        ? { [K in keyof T]: Unwrap<T[K]> }
        : T;

interface Struct {
  <
    const Name extends string,
    const Schema,
    Ctx extends Record<any, any> = { scope: {} },
  >(
    name: PascalCase<Name>,
    t: type.validate<Schema, Ctx["scope"]>,
    description?: string,
  ): Pretty<
    {
      [key in Name]: TW.Struct<
        Name,
        type.instantiate<Schema, Ctx["scope"]>["infer"]
      >;
    } & {
      [TW.Step]: (ctx: Ctx) => {
        name: Ctx["name"];
        steps: Ctx["steps"] &
          Record<
            Name,
            TW.Struct<Name, type.instantiate<Schema, Ctx["scope"]>["infer"]>
          >;
        [TW.Step]: Ctx["step"];
        scope: Record<
          Name,
          TW.Struct<Name, type.instantiate<Schema, Ctx["scope"]>["infer"]>
        > &
          Ctx["scope"];
        last: TW.Struct<Name, type.instantiate<Schema, Ctx["scope"]>["infer"]>;
        plugins: Ctx["plugins"];
      };
    }
  >;

  <
    const Name extends string,
    const zero,
    const one,
    const rest extends array,
    Ctx extends Record<any, any> = { scope: {} },
    r = type.instantiate<[zero, one, ...rest], Ctx["scope"]>,
  >(
    name: Name,
    _0: zero extends IndexZeroOperator
      ? zero
      : type.validate<zero, Ctx["scope"]>,
    _1: zero extends "keyof"
      ? type.validate<one, Ctx["scope"]>
      : zero extends "instanceof"
        ? conform<one, Constructor>
        : zero extends "==="
          ? conform<one, unknown>
          : conform<one, ArgTwoOperator>,
    ..._2: zero extends "==="
      ? rest
      : zero extends "instanceof"
        ? conform<rest, readonly Constructor[]>
        : one extends TupleInfixOperator
          ? one extends ":"
            ? [Predicate<distill.In<type.infer<zero, Ctx["scope"]>>>]
            : one extends "=>"
              ? [Morph<distill.Out<type.infer<zero, Ctx["scope"]>>, unknown>]
              : one extends "|>"
                ? [type.validate<rest[0], Ctx["scope"]>]
                : one extends "@"
                  ? [TypeMeta.MappableInput, NodeSelector?]
                  : [type.validate<rest[0], Ctx["scope"]>]
          : []
  ): r extends infer _
    ? {
        [key in Name]: TW.Struct<Name, _ extends ArkType<infer T> ? T : _>;
      } & {
        [TW.Step]: (ctx: Ctx) => {
          name: Ctx["name"];
          steps: Ctx["steps"] &
            Record<Name, TW.Struct<Name, _ extends ArkType<infer T> ? T : _>>;
          [TW.Step]: Ctx["step"];
          scope: Record<
            Name,
            TW.Struct<Name, _ extends ArkType<infer T> ? T : _>
          > &
            Ctx["scope"];
          last: TW.Struct<Name, _ extends ArkType<infer T> ? T : _>;
          plugins: Ctx["plugins"];
        };
      }
    : never;
}

export const Struct: Struct = ((name: string) => ({
  [name]: undefined,
})) as never;
