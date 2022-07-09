import { AnyRoute, Route } from "./createRoute";
import { joinRoutes } from "./joinRoutes";

/**
 * Returns a string created by joining the base path and routes URL
 */
export function useHref<
  TRoute extends AnyRoute,
  TRouteParams = TRoute extends Route<infer TParams, any, any, any>
    ? TParams
    : never,
  TRouteQuery = TRoute extends Route<any, infer TQuery, any, any>
    ? TQuery
    : never
>(to: TRoute, params: TRouteParams, query: TRouteQuery): string {
  try {
    const routePath = to.reverse({ params, query });

    return joinRoutes(to.basePath, routePath);
  } catch (e) {
    console.error(e);
  }

  return "";
}
