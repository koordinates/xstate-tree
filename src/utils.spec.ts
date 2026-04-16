import { toJSON } from "./utils";

describe("toJSON", () => {
  it("strips the specified keys from plain objects", () => {
    const result = toJSON<{ a: number; b?: number }>({ a: 1, b: 2 }, ["b"]);

    expect(result.a).toBe(1);
    expect(result.b).toBeUndefined();
  });

  it("forwards to the value's toJSON method when present", () => {
    const value = {
      secret: "should-not-appear",
      toJSON() {
        return { forwarded: true };
      },
    };

    const result = toJSON<{ forwarded: boolean; secret?: string }>(value, [
      "forwarded",
    ]);

    expect(result.forwarded).toBe(true);
    expect(result.secret).toBeUndefined();
  });
});
