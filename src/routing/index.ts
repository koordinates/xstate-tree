export type { RoutingEvent } from "./routingEvent";
export {
  type Route,
  type AnyRoute,
  type RouteParams,
  type RouteMeta,
  type RouteQuery,
  type RouteArguments,
  type ArgumentsForRoute,
  type Params,
  type Query,
  type Meta,
  type SharedMeta,
  type RouteArgumentFunctions,
  buildCreateRoute,
} from "./createRoute";
export { joinRoutes } from "./joinRoutes";
export { Link, type LinkProps, type StyledLink } from "./Link";
export { matchRoute } from "./matchRoute";
export {
  handleLocationChange,
  type Routing404Event,
} from "./handleLocationChange";
export { useIsRouteActive } from "./useIsRouteActive";
export { useRouteArgsIfActive } from "./useRouteArgsIfActive";
export { useOnRoute } from "./useOnRoute";

export {
  RoutingContext,
  TestRoutingContext,
  useInRoutingContext,
  useInTestRoutingContext,
  useActiveRouteEvents,
} from "./providers";
