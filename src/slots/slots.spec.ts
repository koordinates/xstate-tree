import { multiSlot, singleSlot, GetSlotNames } from "./slots";

describe("slot utilities", () => {
  describe("multiSlot", () => {
    it("returns an object that allows you to generate slot ids given an id", () => {
      const slot = multiSlot("Names");

      expect(slot.getId("id")).toEqual("id-namesmulti-slots");
    });

    it("appends an optional suffix to the slot id", () => {
      const slot = multiSlot("Todos");

      expect(slot.getId("123", "v2")).toEqual("123-todosmulti-slots-v2");
    });
  });

  describe("singleSlot", () => {
    it("returns an object that allows you to generate a slot id", () => {
      const slot = singleSlot("Name");

      expect(slot.getId()).toEqual("name-slot");
    });

    it("includes an optional suffix before the slot suffix", () => {
      const slot = singleSlot("Screen");

      expect(slot.getId("v1")).toEqual("screen-v1-slot");
    });
  });

  describe("GetSlotNames", () => {
    it("converts an array of Slot types to a union of the Slot names", () => {
      const slots = [multiSlot("foo"), singleSlot("bar")] as const;

      expect(slots.length).toEqual(2);

      // should be "foo" | "bar"
      type Foo = GetSlotNames<typeof slots>;

      const fooTest = "fooMulti" as const;
      const barTest = "bar" as const;
      const invalidTest: "invalid" = "invalid" as const;
      const _fooOtherTest: Foo = fooTest;
      const _barOtherTest: Foo = barTest;
      // @ts-expect-error
      const _invalidOtherTest: Foo = invalidTest;
    });
  });
});
