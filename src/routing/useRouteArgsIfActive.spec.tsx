import { renderHook } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { z } from "zod";

import { buildCreateRoute } from "./createRoute";
import { RoutingContext } from "./providers";
import { useRouteArgsIfActive } from "./useRouteArgsIfActive";

const createRoute = buildCreateRoute(() => createMemoryHistory<any>(), "/");
const fooRoute = createRoute.simpleRoute()({
  event: "foo",
  url: "/:foo",
  paramsSchema: z.object({ foo: z.string() }),
  querySchema: z.object({ bar: z.string() }),
});
describe("useRouteArgsIfActive", () => {
  it("returns undefined if the route is not active", () => {
    const { result } = renderHook(() => useRouteArgsIfActive(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider value={{ activeRouteEvents: { current: [] } }}>
          {children}
        </RoutingContext.Provider>
      ),
    });

    expect(result.current).toBe(undefined);
  });

  it("returns the routes arguments if the route is active", () => {
    const { result } = renderHook(() => useRouteArgsIfActive(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider
          value={{
            activeRouteEvents: {
              current: [
                {
                  type: "foo",
                  meta: {},
                  originalUrl: "",
                  params: { foo: "bar" },
                  query: { bar: "baz" },
                },
              ],
            },
          }}
        >
          {children}
        </RoutingContext.Provider>
      ),
    });

    expect(result.current).toEqual({
      params: { foo: "bar" },
      query: { bar: "baz" },
      meta: {},
    });
  });
});
