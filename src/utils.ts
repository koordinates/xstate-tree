import { ComponentPropsWithRef, JSXElementConstructor } from "react";

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

export type EmptyKeys<T> = keyof {
  [K in keyof T as IsEmptyObject<T[K], true> extends true ? K : never]: T[K];
};

/**
 * Marks any required property that can accept undefined as optional
 */
export type MarkOptionalLikePropertiesOptional<T> = Omit<T, EmptyKeys<T>> &
  Partial<Pick<T, EmptyKeys<T>>>;

export type IsEmptyObject<
  Obj,
  ExcludeOptional extends boolean = false
> = undefined extends Obj
  ? true
  : [keyof (ExcludeOptional extends true ? OmitOptional<Obj> : Obj)] extends [
      never
    ]
  ? true
  : false;

export type IsUnknown<T> = unknown extends T ? true : false;
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

export function difference(a: any, b: any) {
  const result: Record<any, any> = {};

  for (const key in b) {
    if (!a.hasOwnProperty(key)) {
      result[key] = b[key];
    } else if (Array.isArray(b[key]) && Array.isArray(a[key])) {
      if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
        result[key] = b[key];
      }
    } else if (typeof b[key] === "object" && typeof a[key] === "object") {
      const value = difference(a[key], b[key]);
      if (Object.keys(value).length > 0) {
        result[key] = value;
      }
    } else if (b[key] !== a[key]) {
      result[key] = b[key];
    }
  }

  return result;
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

export function mergeMeta(meta: Record<string, any>) {
  return Object.keys(meta).reduce((acc, key) => {
    const value = meta[key];

    // Assuming each meta value is an object
    Object.assign(acc, value);

    return acc;
  }, {});
}
function getCircularReplacer(stripKeys: string[]) {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (stripKeys.includes(key)) {
      return;
    }

    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our set
      seen.add(value);
    }
    return value;
  };
}

export function toJSON<T = unknown>(
  value: unknown,
  stripKeys = [] as string[]
): T {
  return JSON.parse(JSON.stringify(value, getCircularReplacer(stripKeys)));
}
