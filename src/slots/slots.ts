/**
 * @public
 */
export enum SlotType {
  SingleSlot,
  MultiSlot,
}

/**
 * @public
 */
export type SingleSlot<T extends string> = {
  type: SlotType.SingleSlot;
  name: T;
  getId(): string;
};

/**
 * @public
 */
export type MultiSlot<T extends string> = {
  type: SlotType.MultiSlot;
  name: `${T}Multi`;
  getId(id: string): string;
};

/**
 * @public
 */
export type Slot = SingleSlot<any> | MultiSlot<any>;

/**
 * @public
 */
export function singleSlot<T extends string>(name: T): SingleSlot<T> {
  return {
    type: SlotType.SingleSlot,
    name,
    getId: () => `${name.toLowerCase()}-slot`,
  };
}

/**
 * @public
 */
export function multiSlot<T extends string>(name: T): MultiSlot<T> {
  return {
    type: SlotType.MultiSlot,
    name: `${name}Multi`,
    getId: (id: string) => `${id}-${name.toLowerCase()}multi-slots`,
  };
}

/**
 * @public
 */
export type GetSlotNames<TSlots extends readonly Slot[]> =
  TSlots[number]["name"];
