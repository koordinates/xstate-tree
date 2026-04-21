import { renderHook } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";

import { buildCreateRoute } from "./createRoute";
import { RoutingContext } from "./providers";
import { useIsRouteActive } from "./useIsRouteActive";

const createRoute = buildCreateRoute(() => createMemoryHistory<any>(), "/");
const fooRoute = createRoute.simpleRoute()({
  event: "foo",
  url: "/",
});
const barRoute = createRoute.simpleRoute()({
  event: "bar",
  url: "/",
});
describe("useIsRouteActive", () => {
  it("returns false if the supplied route is not part of the activeRouteEvents in the routing context", () => {
    const { result } = renderHook(() => useIsRouteActive(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider value={{ activeRouteEvents: { current: [] } }}>
          {children}
        </RoutingContext.Provider>
      ),
    });

    expect(result.current).toBe(false);
  });

  it("throws an error if not called within the RoutingContext", () => {
    expect(() => renderHook(() => useIsRouteActive(fooRoute))).toThrow();
  });

  it("returns true if the supplied route is part of the activeRouteEvents in the routing context", () => {
    const { result } = renderHook(() => useIsRouteActive(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider
          value={{
            activeRouteEvents: {
              current: [
                {
                  type: "foo",
                  meta: {},
                  originalUrl: "",
                  params: {},
                  query: {},
                },
              ],
            },
          }}
        >
          {children}
        </RoutingContext.Provider>
      ),
    });

    expect(result.current).toBe(true);
  });

  it("returns false when the predicate rejects the active route event", () => {
    const { result } = renderHook(
      () => useIsRouteActive([fooRoute], (event) => event.params.id === "5"),
      {
        wrapper: ({ children }) => (
          <RoutingContext.Provider
            value={{
              activeRouteEvents: {
                current: [
                  {
                    type: "foo",
                    meta: {},
                    originalUrl: "",
                    params: { id: "3" },
                    query: {},
                  },
                ],
              },
            }}
          >
            {children}
          </RoutingContext.Provider>
        ),
      }
    );

    expect(result.current).toBe(false);
  });

  it("returns true when the predicate accepts the active route event", () => {
    const { result } = renderHook(
      () => useIsRouteActive([fooRoute], (event) => event.params.id === "5"),
      {
        wrapper: ({ children }) => (
          <RoutingContext.Provider
            value={{
              activeRouteEvents: {
                current: [
                  {
                    type: "foo",
                    meta: {},
                    originalUrl: "",
                    params: { id: "5" },
                    query: {},
                  },
                ],
              },
            }}
          >
            {children}
          </RoutingContext.Provider>
        ),
      }
    );

    expect(result.current).toBe(true);
  });

  it("handles multiple routes where one is active", () => {
    const { result } = renderHook(() => useIsRouteActive(fooRoute, barRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider
          value={{
            activeRouteEvents: {
              current: [
                {
                  type: "foo",
                  meta: {},
                  originalUrl: "",
                  params: {},
                  query: {},
                },
              ],
            },
          }}
        >
          {children}
        </RoutingContext.Provider>
      ),
    });

    expect(result.current).toBe(true);
  });
});
