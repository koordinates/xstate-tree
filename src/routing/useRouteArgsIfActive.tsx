import { assertIsDefined } from "../utils";

import { AnyRoute, ArgumentsForRoute } from "./createRoute";
import { useActiveRouteEvents } from "./providers";
import { useIsRouteActive } from "./useIsRouteActive";

/**
 * @public
 * Returns the arguments for the given route if the route is active.
 * Returns undefined if the route is not active.
 *
 * @param route - the route to get the arguments for
 * @returns the arguments for the given route if the route is active, undefined otherwise
 * @throws if used outside of an xstate-tree root
 */
export function useRouteArgsIfActive<TRoute extends AnyRoute>(
  route: TRoute
): ArgumentsForRoute<TRoute> | undefined {
  const isActive = useIsRouteActive(route);
  const activeRoutes = useActiveRouteEvents();

  if (!isActive) {
    return undefined;
  }

  const activeRoute = activeRoutes?.find(
    (activeRoute) => activeRoute.type === route.event
  );
  assertIsDefined(
    activeRoute,
    "active route is not defined, but the route is active??"
  );

  return {
    params: activeRoute.params,
    query: activeRoute.query,
    meta: activeRoute.meta,
  } as ArgumentsForRoute<TRoute>;
}
