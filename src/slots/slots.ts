enum SlotType {
  SingleSlot,
  MultiSlot,
}

type SingleSlot<T> = {
  type: SlotType.SingleSlot;
  name: T;
  getId(): string;
};

type MultiSlot<T> = {
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
 * @internal
 */
export type GetSlotNames<TSlots extends readonly Slot[]> =
  TSlots[number]["name"];
