import { broadcast } from "../../xstateTree";
import { AnyRoute } from "../createRoute";
import { matchRoute } from "../matchRoute";
import { RoutingEvent } from "../routingEvent";

/**
 * @public
 */
export type Routing404Event = {
  type: "ROUTING_404";
  url: string;
};

/**
 * @internal
 */
export function handleLocationChange(
  routes: AnyRoute[],
  basePath: string,
  path: string,
  search: string,
  meta?: Record<any, any>
): { events: RoutingEvent<any>[]; matchedRoute: AnyRoute } | undefined {
  console.debug("[xstate-tree] Matching routes", basePath, path, search, meta);
  const match = matchRoute(routes, basePath, path, search);
  console.debug("[xstate-tree] Match result", match);

  if (match.type === "no-matches") {
    const fourOhFour: Routing404Event = {
      type: "ROUTING_404",
      url: path,
    };

    // @ts-ignore the event won't match GlobalEvents
    broadcast(fourOhFour);
    return;
  } else if (match.type === "match-error") {
    console.error("Error matching route for", location.pathname);
    return;
  } else {
    const matchedEvent = match.event;
    matchedEvent.meta = { ...(meta ?? {}) };
    (matchedEvent.meta as Record<any, any>).indexEvent = true;
    const { params } = match.event;

    const routingEvents: any[] = [];

    let route: AnyRoute = match.route;
    while (route.parent) {
      routingEvents.push(
        route.parent.getEvent({ params, query: {}, meta: { ...(meta ?? {}) } })
      );
      route = route.parent;
    }

    const clonedRoutingEvents = [...routingEvents];
    while (routingEvents.length > 0) {
      const event = routingEvents.pop()!;
      // copy the originalUrl to all parent events
      event.originalUrl = match.event.originalUrl;

      // @ts-ignore the event won't match GlobalEvents
      broadcast(event);
    }

    // @ts-ignore the event won't match GlobalEvents
    broadcast(matchedEvent);

    return {
      events: [...clonedRoutingEvents, match.event],
      matchedRoute: match.route,
    };
  }
}
