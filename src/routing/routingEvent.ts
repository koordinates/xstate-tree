import type { Route } from "./createRoute";

/**
 * @public
 * Converts a Route type into the Event that will be broadcast for that route
 *
 * All routes a machine should handle should be added to the machines event union using this type
 */
export type RoutingEvent<T> = T extends Route<
  infer TParams,
  infer TQuery,
  infer TEvent,
  infer TMeta
>
  ? {
      type: TEvent;
      originalUrl: string;
      params: TParams;
      query: TQuery;
      meta: TMeta;
    }
  : never;
