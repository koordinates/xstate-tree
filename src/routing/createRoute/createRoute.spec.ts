import { createMemoryHistory } from "history";
import * as Z from "zod";

import { XstateTreeHistory } from "../../types";
import { assertIsDefined } from "../../utils";

import { buildCreateRoute } from "./createRoute";

const hist = createMemoryHistory<{ meta?: unknown }>();
const createRoute = buildCreateRoute(hist, "/");

describe("createRoute", () => {
  describe("createRoute.dynamicRoute", () => {
    const dynamicRoute = createRoute.dynamicRoute({
      params: Z.object({
        foo: Z.string(),
      }),
    })({
      event: "GO_FOO",
      matches: (url, _search) => {
        if (url === "/foo") {
          return {
            params: {
              foo: "foo",
            },
          };
        }

        return false;
      },
      reverse: ({ params }) => {
        return "/foo/" + params?.foo;
      },
    });

    it("uses the routes matching function to determine if there is a match", () => {
      expect(dynamicRoute.matches("/foo", "")).toEqual({
        type: "GO_FOO",
        params: { foo: "foo" },
        originalUrl: "/foo",
      });

      expect(dynamicRoute.matches("/foo/bar", "")).toBe(undefined);
    });

    it("can get a url out of the route with reverse", () => {
      expect(dynamicRoute.reverse({ params: { foo: "bar" } })).toBe("/foo/bar");
    });
  });

  describe("createRoute.staticRoute", () => {
    it("returns a route object with appropriate fields set", () => {
      const route = createRoute.staticRoute()("/foo", "GO_FOO");

      expect(route.url).toEqual("/foo/");
    });

    it("attaches the history/basePath arguments supplied to createCreateRoute to the route", () => {
      const route = createRoute.staticRoute()("/foo", "GO_FOO");

      expect(route.basePath).toBe("/");
      expect(route.history).toBe(hist);
    });

    describe("route schemas", () => {
      describe("route with basic param schema", () => {
        it("infers the type of the params from the matched route using the schema", () => {
          const schema = Z.object({
            fooId: Z.string(),
          });
          const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
            params: schema,
          });

          const match = route.matches("/foo/123", "");
          assertIsDefined(match);
          // Testing that the types are correct
          const _dummyParams: Z.TypeOf<typeof schema> = match.params;

          expect(match.params).toEqual({ fooId: "123" });
        });
      });

      describe("nested routes and meta type", () => {
        it("merges the parent routes meta type into the routes meta type, including the SharedMeta type", () => {
          type ParentMeta = { foo: string };
          type ChildMeta = { bar: string };
          const parent = createRoute.staticRoute()("/foo", "GO_FOO", {
            meta: {} as ParentMeta,
          });
          const child = createRoute.staticRoute(parent)("/bar", "GO_BAR", {
            meta: {} as ChildMeta,
          });

          const event = child.getEvent({
            meta: { bar: "bar", foo: "foo", doNotNotifyReactRouter: true },
          });

          expect(event.meta).toEqual({
            bar: "bar",
            foo: "foo",
            doNotNotifyReactRouter: true,
          });
        });
      });

      describe("nested routes and params schemas", () => {
        it("merges the params schemas of both routes together", () => {
          const parentSchema = Z.object({
            barId: Z.string(),
          });
          const parentRoute = createRoute.staticRoute()(
            "/bar/:barId",
            "GO_BAR",
            {
              params: parentSchema,
            }
          );
          const SubSchema = Z.object({
            fooId: Z.string(),
          });
          const route = createRoute.staticRoute(parentRoute)(
            "/foo/:fooId",
            "GO_FOO",
            {
              params: SubSchema,
            }
          );

          const match = route.matches("/bar/456/foo/123", "");
          assertIsDefined(match);
          const mergedSchema = parentSchema.merge(SubSchema);
          // Testing that the types are correct
          const _dummyParams: Z.TypeOf<typeof mergedSchema> = match.params;

          expect(match.params).toEqual({ barId: "456", fooId: "123" });
        });

        it("does not merge the query schema of the parent route", () => {
          const parentRoute = createRoute.staticRoute()(
            "/bar/:barId",
            "GO_BAR",
            {
              params: Z.object({
                barId: Z.string(),
              }),
              query: Z.object({
                someFilter: Z.string(),
              }),
            }
          );
          const route = createRoute.staticRoute(parentRoute)(
            "/foo/:fooId",
            "GO_FOO",
            {
              params: Z.object({
                fooId: Z.string(),
              }),
              query: Z.object({
                someOtherFilter: Z.string(),
              }),
            }
          );

          const match = route.matches(
            "/bar/456/foo/123",
            "?someOtherFilter=foo"
          );
          assertIsDefined(match);

          expect(match.query).toEqual({ someOtherFilter: "foo" });
        });

        it("uses the parent routes params schema if the sub route has no params", () => {
          const parentSchema = Z.object({
            barId: Z.string(),
          });
          const parentRoute = createRoute.staticRoute()(
            "/bar/:barId",
            "GO_BAR",
            {
              params: parentSchema,
            }
          );
          const route = createRoute.staticRoute(parentRoute)("/foo", "GO_FOO");

          const match = route.matches("/bar/456/foo", "");
          assertIsDefined(match);
          // Testing that the types are correct
          const _dummyParams: Z.TypeOf<typeof parentSchema> = match.params;

          expect(match.params).toEqual({ barId: "456" });
        });
      });
    });

    describe("matches", () => {
      const route = createRoute.staticRoute()("/bar/:barId/", "GO_BAR", {
        params: Z.object({
          barId: Z.string().refine((v) => v.startsWith("abc")),
        }),
        query: Z.object({
          someFilter: Z.string()
            .refine((v) => v.startsWith("abc"))
            .optional(),
        }),
      });

      it("returns undefined if the url does not match the route", () => {
        expect(route.matches("/foo", "")).toBeUndefined();
      });

      it("throws an error if the params matched by the route do not match the schema", () => {
        expect(() => route.matches("/bar/123/", "")).toThrowError();
      });

      it("throws an error if the query params do not match", () => {
        expect(() =>
          route.matches("/bar/abc/", "?someFilter=123")
        ).toThrowError();
      });

      it("works with baseRoutes ending with / and routes starting with /", () => {
        const subRoute = createRoute.staticRoute(route)("/sub", "GO_SUB_ROUTE");

        expect(subRoute.matches("/bar/abc/sub", "")).toBeDefined();
      });

      it("returns the matched params/query parameters from the url", () => {
        const match = route.matches("/bar/abc/", "?someFilter=abc");
        assertIsDefined(match);

        expect(match.params).toEqual({
          barId: "abc",
        });
        expect(match.query).toEqual({
          someFilter: "abc",
        });
      });

      it("returns the original url + query string", () => {
        const match = route.matches("/bar/abc/", "?someFilter=abc");
        assertIsDefined(match);

        expect(match.originalUrl).toBe("/bar/abc/?someFilter=abc");
      });

      it("sets the type field to the routes event property", () => {
        const match = route.matches("/bar/abc/", "?someFilter=abc");
        assertIsDefined(match);

        expect(match.type).toBe("GO_BAR");
      });
    });

    describe("navigate", () => {
      it("requires the route arguments", () => {
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string(),
          }),
        });

        route.navigate({
          params: { fooId: "123" },
        });
      });

      it("allows you to omit either params/query if you supply the other but both are fully optional objects", () => {
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string().optional(),
          }),
          query: Z.object({
            bar: Z.string().optional(),
          }),
        });

        route.navigate({
          params: { fooId: "123" },
        });
      });

      it("allows you to omit either optional params/query if the other is required", () => {
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string(),
          }),
          query: Z.object({
            bar: Z.string().optional(),
          }),
        });

        route.navigate({
          params: { fooId: "123" },
        });
      });

      it("uses history.push", () => {
        const hist: XstateTreeHistory = createMemoryHistory();
        const spy = jest.fn();
        hist.push = spy as any;
        const createRoute = buildCreateRoute(hist, "/");
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string(),
          }),
          query: Z.object({
            bar: Z.string().optional(),
          }),
        });

        route.navigate({
          params: { fooId: "123" },
        });
        expect(spy).toHaveBeenCalled();
      });

      it("uses history.replace when the replace meta flag is set", () => {
        const hist: XstateTreeHistory = createMemoryHistory();
        const spy = jest.fn();
        hist.replace = spy as any;
        const createRoute = buildCreateRoute(hist, "/");
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string(),
          }),
          query: Z.object({
            bar: Z.string().optional(),
          }),
        });

        route.navigate({
          params: { fooId: "123" },
          meta: {
            replace: true,
          },
        });
        expect(spy).toHaveBeenCalled();
      });
    });

    describe("reverse", () => {
      it("returns the routes url if the route takes no params/query", () => {
        const route = createRoute.staticRoute()("/foo", "GO_FOO");

        expect(route.reverse()).toBe("/foo/");
      });

      it("plugs the route holes with params if present", () => {
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string(),
          }),
        });

        expect(route.reverse({ params: { fooId: "123" } })).toBe("/foo/123/");
      });

      it("plugs the route holes with params and includes query string if present", () => {
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string(),
          }),
          query: Z.object({
            someFilter: Z.string(),
          }),
        });

        expect(
          route.reverse({
            params: { fooId: "123" },
            query: { someFilter: "123" },
          })
        ).toBe("/foo/123/?someFilter=123");
      });
    });

    describe("getEvent", () => {
      it("returns an event suitable for broadcasting", () => {
        const route = createRoute.staticRoute()("/foo/:fooId", "GO_FOO", {
          params: Z.object({
            fooId: Z.string(),
          }),
          query: Z.object({
            someFilter: Z.string(),
          }),
        });

        expect(
          route.getEvent({
            params: { fooId: "123" },
            query: { someFilter: "123" },
          })
        ).toEqual({
          type: "GO_FOO",
          params: { fooId: "123" },
          query: { someFilter: "123" },
          meta: undefined,
        });
      });
    });

    describe("routing functions for routes with no meta/params/query", () => {
      it("does not require any arguments to be supplied", () => {
        const route = createRoute.staticRoute()("/foo", "GO_FOO");

        route.navigate();
      });

      it("allows you to optionally pass the shared meta info", () => {
        const route = createRoute.staticRoute()("/foo", "GO_FOO");

        route.navigate({ meta: { doNotNotifyReactRouter: true } });
      });
    });
  });
});
