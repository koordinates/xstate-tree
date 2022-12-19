import { createMemoryHistory } from "history";

import { delay } from "../../utils";
import { onBroadcast } from "../../xstateTree";
import { buildCreateRoute } from "../createRoute";
import { RoutingEvent } from "../routingEvent";

import { handleLocationChange, Routing404Event } from "./handleLocationChange";

const hist = createMemoryHistory<{ meta?: unknown }>();
const createRoute = buildCreateRoute(() => hist, "/");
const foo = createRoute.simpleRoute()({ url: "/foo", event: "GO_FOO" });
const bar = createRoute.simpleRoute(foo)({ url: "/bar", event: "GO_BAR" });
const routes = [foo, bar];
describe("handleLocationChange", () => {
  const broadcastEvents: any[] = [];
  let unsub: () => void = () => void 0;

  beforeEach(() => {
    broadcastEvents.splice(0);
    unsub = onBroadcast((e) => broadcastEvents.push(e));
  });
  afterEach(() => {
    unsub();
  });

  it("broadcasts a 404 routing event if no matching route is found", () => {
    handleLocationChange(routes, "/", "/qux", "", () => void 0);
    const fourOhFour: Routing404Event = {
      type: "ROUTING_404",
      url: "/qux",
    };

    expect(broadcastEvents).toEqual([fourOhFour]);
  });

  it("broadcasts the matched routes event for a route with no parents", async () => {
    handleLocationChange(routes, "/", "/foo", "", () => void 0);
    const fooEvent: RoutingEvent<typeof foo> = {
      type: "GO_FOO",
      meta: { indexEvent: true },
      originalUrl: "/foo/",
      // The typings say this is undefined, when in actuality it's an empty object
      // too annoying to fix, only relevant in tests like this
      params: {} as any,
      query: {} as any,
    };

    await delay(1);
    expect(broadcastEvents).toEqual([fooEvent]);
  });

  describe("route with parent route", () => {
    it("broadcasts an event for both the child and parent routes, in parent -> child order, with only the child event marked as an index event", async () => {
      handleLocationChange(routes, "/", "/foo/bar", "", () => void 0);
      const barEvent: RoutingEvent<typeof bar> = {
        type: "GO_BAR",
        meta: { indexEvent: true },
        originalUrl: "/foo/bar/",
        // The typings say this is undefined, when in actuality it's an empty object
        // too annoying to fix, only relevant in tests like this
        params: {} as any,
        query: {} as any,
      };
      const fooEvent: RoutingEvent<typeof foo> = {
        type: "GO_FOO",
        meta: {},
        originalUrl: "/foo/bar/",
        params: {} as any,
        query: {} as any,
      };

      await delay(1);
      expect(broadcastEvents).toEqual([fooEvent, barEvent]);
    });
  });
});
