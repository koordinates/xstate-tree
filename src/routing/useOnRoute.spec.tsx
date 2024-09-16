import { renderHook } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";

import { buildCreateRoute } from "./createRoute";
import { RoutingContext } from "./providers";
import { useOnRoute } from "./useOnRoute";

const createRoute = buildCreateRoute(() => createMemoryHistory<any>(), "/");
const fooRoute = createRoute.simpleRoute()({
  event: "foo",
  url: "/",
});

describe("useOnRoute", () => {
  it("returns false if the supplied route is not part of the activeRouteEvents in the routing context", () => {
    const { result } = renderHook(() => useOnRoute(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider value={{ activeRouteEvents: { current: [] } }}>
          {children}
        </RoutingContext.Provider>
      ),
    });

    expect(result.current).toBe(false);
  });

  it("throws an error if not called within the RoutingContext", () => {
    expect(() => renderHook(() => useOnRoute(fooRoute))).toThrow();
  });

  it("returns false if the supplied route is part of the activeRouteEvents but not marked as an index event", () => {
    const { result } = renderHook(() => useOnRoute(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider
          value={{
            activeRouteEvents: {
              current: [
                {
                  type: "foo",
                  meta: { indexEvent: false },
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

    expect(result.current).toBe(false);
  });

  it("returns true if the supplied route is part of the activeRouteEvents and marked as an index event", () => {
    const { result } = renderHook(() => useOnRoute(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider
          value={{
            activeRouteEvents: {
              current: [
                {
                  type: "foo",
                  meta: { indexEvent: true },
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

  it("returns false if a different route is active and marked as an index event", () => {
    const { result } = renderHook(() => useOnRoute(fooRoute), {
      wrapper: ({ children }) => (
        <RoutingContext.Provider
          value={{
            activeRouteEvents: {
              current: [
                {
                  type: "bar",
                  meta: { indexEvent: true },
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

    expect(result.current).toBe(false);
  });
});
