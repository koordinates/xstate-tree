import { createMemoryHistory } from "history";
import * as Z4 from "zod/v4";

import { assert } from "../../utils";

import { buildCreateRoute } from "./createRoute";

// Route schemas are typed structurally (see RouteSchema), so a zod 4 schema must be
// accepted end to end: at the type level (params/query inferred from `_output`) and
// at runtime (`parse` and the parent-merge in `simpleRoute`).
const hist = createMemoryHistory<{ meta?: unknown }>();
const createRoute = buildCreateRoute(() => hist, "/");

describe("createRoute with zod 4 schemas", () => {
  const parentRoute = createRoute.simpleRoute()({
    url: "/bar/:barId",
    event: "GO_BAR",
    paramsSchema: Z4.object({ barId: Z4.string().regex(/^\d+$/) }),
    querySchema: Z4.object({ someFilter: Z4.string().optional() }),
  });
  const route = createRoute.simpleRoute(parentRoute)({
    url: "/foo/:fooId",
    event: "GO_FOO",
    paramsSchema: Z4.object({ fooId: Z4.string() }),
    querySchema: Z4.object({ page: Z4.string().optional() }),
  });

  it("infers params and query from the zod 4 schema", () => {
    const match = route.matches("/bar/456/foo/123", "?page=2");
    assert(match !== false);

    const fooId: string = match.params.fooId;
    const barId: string = match.params.barId;
    const page: string | undefined = match.query.page;

    expect({ fooId, barId, page }).toEqual({
      fooId: "123",
      barId: "456",
      page: "2",
    });
  });

  it("rejects params through the merged zod 4 schema", () => {
    // `barId` comes from the parent route, so this only fails if the two zod 4
    // schemas were merged and the merged schema was parsed.
    expect(() => route.matches("/bar/abc/foo/123", "")).toThrow();
  });
});
