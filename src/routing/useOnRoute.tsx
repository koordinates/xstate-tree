import { AnyRoute, type SharedMeta } from "./createRoute";
import { useActiveRouteEvents } from "./providers";

/**
 * @public
 * Accepts a single Route and returns true if the route is currently active and marked as an index route.
 * False if not.
 *
 * If used outside of a RoutingContext, an error will be thrown.
 * @param route - the route to check
 * @returns true if the route is active and an index route, false if not
 * @throws if used outside of an xstate-tree root
 */
export function useOnRoute(route: AnyRoute): boolean {
  const activeRouteEvents = useActiveRouteEvents();

  if (!activeRouteEvents) {
    throw new Error(
      "useOnRoute must be used within a RoutingContext. Are you using it outside of an xstate-tree Root?"
    );
  }

  return activeRouteEvents.some(
    (activeRouteEvent) =>
      activeRouteEvent.type === route.event &&
      (activeRouteEvent.meta as SharedMeta)?.indexEvent === true
  );
}
