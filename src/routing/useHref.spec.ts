import { createMemoryHistory } from "history";
import * as Z from "zod";

import { buildCreateRoute } from "./createRoute";
import { useHref } from "./useHref";

const hist = createMemoryHistory<{ meta?: unknown }>();
const createRoute = buildCreateRoute(hist, "/foo");
const route = createRoute.simpleRoute()({
  url: "/bar/:type(valid)",
  event: "GO_BAR",
  paramsSchema: Z.object({
    type: Z.literal("valid"),
  }),
});

describe("useHref", () => {
  it("reverses the supplied route and joins the basePath onto it", () => {
    expect(useHref(route, { type: "valid" }, undefined)).toBe(
      "/foo/bar/valid/"
    );
  });

  it("fallsback to an empty string if there is an error", () => {
    expect(useHref(route, { type: "invalid" }, undefined)).toBe("");
  });
});
