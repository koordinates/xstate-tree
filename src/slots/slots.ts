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
export type SingleSlot<T> = {
  type: SlotType.SingleSlot;
  name: T;
  getId(): string;
};

/**
 * @public
 */
export type MultiSlot<T> = {
  type: SlotType.MultiSlot;
  name: T;
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
    name,
    getId: (id: string) => `${id}-${name.toLowerCase()}-slots`,
  };
}

/**
 * @public
 */
export type GetSlotNames<TSlots extends readonly Slot[]> =
  TSlots[number]["name"];
