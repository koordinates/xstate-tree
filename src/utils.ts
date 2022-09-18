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

export function isLikelyPageLoad(): boolean {
  // without performance API, we can't tell if this is a page load
  if (typeof performance === "undefined") {
    return false;
  }

  // if it's been < 5 seconds since the page was loaded, it's probably a page load
  return performance.now() < 5000;
}

/*
 * @private
 *
 * Find the differences between two objects and push to a new object
 * (c) 2019 Chris Ferdinandi & Jascha Brinkmann, MIT License, https://gomakethings.com & https://twitter.com/jaschaio
 * @param  {Object} obj1 The original object
 * @param  {Object} obj2 The object to compare against it
 * @return {Object}      An object of differences between the two
 */
export function difference(obj1: any, obj2: any): Record<any, any> {
  if (!obj2 || Object.prototype.toString.call(obj2) !== "[object Object]") {
    return obj1;
  }

  const diffs: Record<any, any> = {};
  let key;

  /**
   * Check if two arrays are equal
   * @param  {Array}   arr1 The first array
   * @param  {Array}   arr2 The second array
   * @return {Boolean}      If true, both arrays are equal
   */
  const arraysMatch = function arraysMatch(arr1: any[], arr2: any[]) {
    if (arr1.length !== arr2.length) return false;

    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }

    return true;
  };

  /**
   * Compare two items and push non-matches to object
   * @param  {*}      item1 The first item
   * @param  {*}      item2 The second item
   * @param  {String} key   The key in our object
   */
  function compare(item1: any, item2: any, key: string) {
    const type1 = Object.prototype.toString.call(item1);
    const type2 = Object.prototype.toString.call(item2);

    if (type2 === "[object Undefined]") {
      diffs[key] = null;

      return;
    }

    if (type1 !== type2) {
      diffs[key] = item2;

      return;
    }

    if (type1 === "[object Object]") {
      const objDiff = difference(item1, item2);
      if (Object.keys(objDiff).length > 0) {
        diffs[key] = objDiff;
      }

      return;
    }

    if (type1 === "[object Array]") {
      if (!arraysMatch(item1, item2)) {
        diffs[key] = item2;
      }

      return;
    }

    if (type1 === "[object Function]") {
      if (item1.toString() !== item2.toString()) {
        diffs[key] = item2;
      }
    } else {
      if (item1 !== item2) {
        diffs[key] = item2;
      }
    }
  }

  for (key in obj1) {
    if (obj1.hasOwnProperty(key)) {
      compare(obj1[key], obj2[key], key);
    }
  }

  for (key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (!obj1[key] && obj1[key] !== obj2[key]) {
        diffs[key] = obj2[key];
      }
    }
  }

  return diffs;
}

/*
 * @private
 *
 * Check if two objects or arrays are equal
 * (c) 2021 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {*}       obj1 The first item
 * @param  {*}       obj2 The second item
 * @return {Boolean}       Returns true if they're equal in value
 */
export function isEqual(obj1: any, obj2: any): boolean {
  /**
   * More accurately check the type of a JavaScript object
   * @param  {Object} obj The object
   * @return {String}     The object type
   */
  function getType(obj: Record<any, any>) {
    return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
  }

  function areArraysEqual() {
    if (obj1.length !== obj2.length) return false;

    for (let i = 0; i < obj1.length; i++) {
      if (!isEqual(obj1[i], obj2[i])) return false;
    }

    return true;
  }

  function areObjectsEqual() {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;

    for (const key in obj1) {
      if (Object.prototype.hasOwnProperty.call(obj1, key)) {
        if (!isEqual(obj1[key], obj2[key])) return false;
      }
    }

    return true;
  }

  function areFunctionsEqual() {
    return obj1.toString() === obj2.toString();
  }

  function arePrimitivesEqual() {
    return obj1 === obj2;
  }

  const type = getType(obj1);

  if (type !== getType(obj2)) return false;

  if (type === "array") return areArraysEqual();
  if (type === "object") return areObjectsEqual();
  if (type === "function") return areFunctionsEqual();
  return arePrimitivesEqual();
}

export function isNil<T>(
  // eslint-disable-next-line @rushstack/no-new-null
  value: T | null | undefined
): value is null | undefined {
  return value === null || value === undefined;
}
