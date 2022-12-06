import { AnyRoute } from "./createRoute";
import { useActiveRouteEvents } from "./providers";

/**
 * Accepts Routes and returns true if any route is currently active. False if not.
 *
 * If used outside of a RoutingContext, an error will be thrown.
 * @param routes - the routes to check
 * @returns true if any route is active, false if not
 * @throws if used outside of a RoutingContext
 */
export function useIsRouteActive(...routes: AnyRoute[]): boolean {
  const activeRouteEvents = useActiveRouteEvents();

  if (!activeRouteEvents) {
    throw new Error(
      "useIsRouteActive must be used within a RoutingContext. Are you using it outside of an xstate-tree Root?"
    );
  }

  return activeRouteEvents.some((activeRouteEvent) => {
    return routes.some((route) => activeRouteEvent.type === route.event);
  });
}
