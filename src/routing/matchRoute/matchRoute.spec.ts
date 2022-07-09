import { createMemoryHistory } from "history";
import * as Z from "zod";

import { buildCreateRoute } from "../createRoute";

import { matchRoute } from "./matchRoute";

const hist = createMemoryHistory<{ meta?: unknown }>();
const createRoute = buildCreateRoute(hist, "/");
describe("matchRoute", () => {
  const route1 = createRoute.staticRoute()("/route1", "ROUTE_1");
  const route2 = createRoute.staticRoute()("/route2", "ROUTE_2", {
    query: Z.object({ foo: Z.number() }),
  });
  const route3 = createRoute.staticRoute()("/route3/:foo", "ROUTE_3", {
    params: Z.object({
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
});
