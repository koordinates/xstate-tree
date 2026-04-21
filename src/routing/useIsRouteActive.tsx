import { AnyRoute } from "./createRoute";
import { useActiveRouteEvents } from "./providers";
import { RoutingEvent } from "./routingEvent";

/**
 * @public
 * Predicate invoked with the matching active route event to decide whether the
 * route should be considered active.
 */
export type IsRouteActivePredicate<TRoutes extends AnyRoute[]> = (
  event: RoutingEvent<TRoutes[number]>
) => boolean;

/**
 * @public
 * Accepts Routes and returns true if any route is currently active. False if not.
 *
 * If used outside of a RoutingContext, an error will be thrown.
 * @param routes - the routes to check
 * @returns true if any route is active, false if not
 * @throws if used outside of an xstate-tree root
 */
export function useIsRouteActive(...routes: AnyRoute[]): boolean;
/**
 * @public
 * Accepts an array of Routes and a predicate. Returns true if any of the
 * routes is currently active AND the predicate returns true when called with
 * the matching active route event.
 *
 * If used outside of a RoutingContext, an error will be thrown.
 * @param routes - the routes to check
 * @param predicate - called with the matching active route event; return true to treat the route as active
 * @returns true if any route is active and the predicate returns true, false otherwise
 * @throws if used outside of an xstate-tree root
 */
export function useIsRouteActive<TRoutes extends AnyRoute[]>(
  routes: [...TRoutes],
  predicate: IsRouteActivePredicate<TRoutes>
): boolean;
export function useIsRouteActive(
  ...args: AnyRoute[] | [AnyRoute[], IsRouteActivePredicate<AnyRoute[]>]
): boolean {
  const activeRouteEvents = useActiveRouteEvents();

  if (!activeRouteEvents) {
    throw new Error(
      "useIsRouteActive must be used within a RoutingContext. Are you using it outside of an xstate-tree Root?"
    );
  }

  let routes: AnyRoute[];
  let predicate: IsRouteActivePredicate<AnyRoute[]> | undefined;
  if (
    args.length === 2 &&
    Array.isArray(args[0]) &&
    typeof args[1] === "function"
  ) {
    routes = args[0];
    predicate = args[1];
  } else {
    routes = args as AnyRoute[];
  }

  return activeRouteEvents.some((activeRouteEvent) => {
    const matches = routes.some(
      (route) => activeRouteEvent.type === route.event
    );
    if (!matches) return false;
    return predicate ? predicate(activeRouteEvent) : true;
  });
}
