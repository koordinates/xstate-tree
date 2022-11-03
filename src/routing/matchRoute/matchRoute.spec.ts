import { createMemoryHistory } from "history";
import * as Z from "zod";

import { buildCreateRoute } from "../createRoute";

import { matchRoute } from "./matchRoute";

const hist = createMemoryHistory<{ meta?: unknown }>();
const createRoute = buildCreateRoute(hist, "/");
describe("matchRoute", () => {
  const route1 = createRoute.simpleRoute()({ url: "/route1", event: "ROUTE_1" });
  const route2 = createRoute.simpleRoute()({
    url: "/route2",
    event: "ROUTE_2",
    querySchema: Z.object({ foo: Z.number() }),
  });
  const route3 = createRoute.simpleRoute()({
    url: "/route3/:foo",
    event: "ROUTE_3",
    paramsSchema: Z.object({
      foo: Z.string(),
    }),
  });
  const routes = [route1, route2, route3];

  it("returns a matched type if it finds a matching route", () => {
    expect(matchRoute(routes, "", "/route1", "")).toMatchObject({
      type: "matched",
      route: route1,
    });
  });

  it("returns a no-matches type if it finds no matching routes", () => {
    expect(matchRoute(routes, "", "/foo", "")).toEqual({ type: "no-matches" });
  });

  it("trims the basePath if present before matching", () => {
    expect(matchRoute(routes, "/base/", "/base/route1/", "")).toMatchObject({
      type: "matched",
      route: route1,
    });
  });

  it("returns a match-error type if there is a problem parsing the query/params schema", () => {
    expect(matchRoute(routes, "", "/route2", "?foo=123")).toEqual({
      type: "match-error",
    });
  });

  it("provides type safe route/event matches", () => {
    const match = matchRoute(routes, "", "/route1", "");

    if (match.type === "matched") {
      expect(match.route).toBe(route1);
      expect(match.event.type).toBe("ROUTE_1");

      const _test: "ROUTE_1" | "ROUTE_2" | "ROUTE_3" = match.route.event;

      if (match.event.type === "ROUTE_3") {
        const _test2: string = match.event.params.foo;
      }
    }
  });
});
