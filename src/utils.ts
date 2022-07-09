import { ComponentPropsWithRef, JSXElementConstructor } from "react";
import { Interpreter, StateMachine } from "xstate";

export type PropsOf<
  C extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>
> = JSX.LibraryManagedAttributes<C, ComponentPropsWithRef<C>>;

export function delay(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type OmitOptional<T> = {
  [P in keyof Required<T> as Pick<T, P> extends Required<Pick<T, P>>
    ? P
    : never]: T[P];
};
export type IsEmptyObject<Obj, ExcludeOptional extends boolean = false> = [
  keyof (ExcludeOptional extends true ? OmitOptional<Obj> : Obj)
] extends [never]
  ? true
  : false;

export function assertIsDefined<T>(
  val: T,
  msg?: string
): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new Error(
      `Expected 'val' to be defined, but received ${val} ${
        msg ? `(${msg})` : ""
      }`
    );
  }
}

export function assert(value: unknown, msg?: string): asserts value {
  if (typeof expect !== "undefined") {
    if (value !== true && msg) {
      console.error(msg);
    }
    expect(value).toEqual(true);
  } else if (value !== true) {
    if (msg) {
      console.error(msg);
    }
    throw new Error("assertion failed");
  }
}

export type StateMachineToInterpreter<T> = T extends StateMachine<
  infer TContext,
  infer TSchema,
  infer TEvents,
  infer TState,
  any,
  any,
  any
>
  ? Interpreter<TContext, TSchema, TEvents, TState, any>
  : never;
