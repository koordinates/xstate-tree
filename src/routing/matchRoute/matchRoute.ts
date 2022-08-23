import { AnyRoute, Route } from "../createRoute";
import { RoutingEvent } from "../routingEvent";

type Return<TRoutes extends Route<any, any, any, any>[]> =
  | {
      type: "matched";
      route: TRoutes[number];
      event: RoutingEvent<TRoutes[number]>;
    }
  | { type: "no-matches" }
  | { type: "match-error" };

/**
 * @public
 */
export function matchRoute<TRoutes extends Route<any, any, any, any>[]>(
  routes: TRoutes,
  basePath: string,
  path: string,
  search: string
): Return<TRoutes> {
  const realBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  const realPath = (() => {
    if (path.startsWith(realBase) && realBase.length > 0) {
      return path.substring(realBase.length);
    }

    return path;
  })();

  const [matchingRoute, event] = routes
    .map((route): [AnyRoute | Error | undefined, undefined | RoutingEvent<any>] => {
      try {
        const match = route.matches(realPath, search);
        if (match) {
          return [route, match as any];
        }
      } catch (e) {
        if (e instanceof Error) {
          return [e, undefined];
        }
      }

      return [undefined, undefined];
    })
    .find(([match]) => Boolean(match)) ?? [undefined, undefined];

  if (matchingRoute === undefined) {
    return { type: "no-matches" };
  } else if (matchingRoute instanceof Error) {
    return { type: "match-error" };
  }

  return { type: "matched", route: matchingRoute, event: event as any };
}
