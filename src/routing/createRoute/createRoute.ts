import { match, compile } from "path-to-regexp";
import { parse, ParsedQuery, stringify } from "query-string";
import * as Z from "zod";

import { XstateTreeHistory } from "../../types";
import { type IsEmptyObject } from "../../utils";
import { joinRoutes } from "../joinRoutes";

type EmptyKeys<T> = keyof {
  [K in keyof T as IsEmptyObject<T[K], true> extends true ? K : never]: T[K];
};
type MakeEmptyObjectPropertiesOptional<T> = Omit<T, EmptyKeys<T>> &
  Partial<Pick<T, EmptyKeys<T>>>;

/**
 * @public
 */
export type RouteArguments<TParams, TQuery, TMeta> = TParams extends undefined
  ? TQuery extends undefined
    ? TMeta extends undefined
      ? {}
      : { meta?: TMeta }
    : TMeta extends undefined
    ? { query: TQuery }
    : { query: TQuery; meta?: TMeta }
  : TQuery extends undefined
  ? TMeta extends undefined
    ? { params: TParams }
    : { params: TParams; meta?: TMeta }
  : TMeta extends undefined
  ? { params: TParams; query: TQuery }
  : { params: TParams; query: TQuery; meta?: TMeta };

/**
 * @public
 */
export type ArgumentsForRoute<T> = T extends Route<
  infer TParams,
  infer TQuery,
  any,
  infer TMeta
>
  ? RouteArguments<TParams, TQuery, TMeta>
  : never;

type EmptyRouteArguments<TParams, TQuery> = IsEmptyObject<
  TParams,
  true
> extends true
  ? IsEmptyObject<TQuery, true> extends true
    ? true
    : false
  : false;

/**
 * @public
 */
export type RouteArgumentFunctions<
  TReturn,
  TParams,
  TQuery,
  TMeta,
  TArgs = RouteArguments<TParams, TQuery, TMeta>
> = IsEmptyObject<TArgs> extends true
  ? () => TReturn
  : keyof TArgs extends "meta"
  ? (args?: TArgs) => TReturn
  : EmptyRouteArguments<TParams, TQuery> extends true
  ? (args?: Partial<TArgs>) => TReturn
  : (args: MakeEmptyObjectPropertiesOptional<TArgs>) => TReturn;

type RouteRedirect<TParams, TQuery, TMeta> = (
  args: MakeEmptyObjectPropertiesOptional<{
    params: TParams;
    query: TQuery;
    meta?: TMeta;
    abortSignal: AbortSignal;
  }>
) => Promise<
  undefined | RouteArguments<Partial<TParams>, Partial<TQuery>, TMeta>
>;

/**
 * @public
 *
 * xstate-tree routing event
 */
export type Route<TParams, TQuery, TEvent, TMeta> = {
  /**
   * Returns an event object for this route, or undefined if the route does not match
   *
   * The params are automatically extracted out of the url
   * The query data is automatically extracted out the search
   *
   * The params/query objects are validated against the routes Zod schemas
   * if they fail to validate an error is thrown
   *
   * @param url - the pathname portion of a url, this function expects the base path to have been stripped
   * @param search - the query string information (ie "?foo=bar")
   * @returns undefined if the route doesn't match the supplied url, event object otherwise
   * @throws Error if the params or query schemas fail to parse the params/query objects
   */
  matches: (
    url: string,
    search: string
  ) =>
    | ({ type: TEvent; originalUrl: string } & RouteArguments<
        TParams,
        TQuery,
        TMeta
      >)
    | false;

  /**
   * Takes in query/params objects as required by the route and returns a URL for that route
   *
   * The returned URL does not contain the base path
   *
   * Reverse can't do anything with meta arguments, so they are removed from the types
   */
  reverse: RouteArgumentFunctions<string, TParams, TQuery, undefined>;

  /**
   * Takes in query/params/meta objects as required by the route and updates the
   * url via History.push
   */
  navigate: RouteArgumentFunctions<void, TParams, TQuery, TMeta>;

  /**
   * Returns an event object for this route based on the supplied params/query/meta
   *
   * Primarily intended for internal use
   */
  getEvent: RouteArgumentFunctions<
    { type: TEvent } & RouteArguments<TParams, TQuery, TMeta>,
    TParams,
    TQuery,
    TMeta
  >;
  matcher: (
    url: string,
    query: ParsedQuery<string> | undefined
  ) =>
    | (RouteArguments<TParams, TQuery, TMeta> & { matchLength: number })
    | false;
  reverser: RouteArgumentFunctions<string, TParams, TQuery, TMeta>;
  /**
   * Event type for this route
   */
  event: TEvent;
  history: XstateTreeHistory;
  basePath: string;
  parent?: AnyRoute;
  paramsSchema?: Z.ZodObject<any>;
  querySchema?: Z.ZodObject<any>;
  redirect?: RouteRedirect<TParams, TQuery, TMeta>;
};

/**
 * @public
 */
export type AnyRoute = {
  matches: (url: string, search: string) => any;
  reverse: any;
  navigate: any;
  getEvent: any;
  event: string;
  basePath: string;
  history: XstateTreeHistory;
  parent?: AnyRoute;
  paramsSchema?: Z.ZodObject<any>;
  querySchema?: Z.ZodObject<any>;
  matcher: (url: string, query: ParsedQuery<string> | undefined) => any;
  reverser: any;
  redirect?: any;
};

/**
 * @public
 */
export type SharedMeta = {
  /**
   * Suppresses this routing change event from being picked up by react-router
   *
   * This is for a Koordinates specific modification to react-router
   * TODO: Remove once there are user providable shared meta
   */
  doNotNotifyReactRouter?: boolean;

  /**
   * True if this was the last routing event in the chain
   */
  indexEvent?: boolean;

  /**
   * If true, use history.replace instead history.push
   */
  replace?: boolean;

  /**
   * true if the event was triggered by the initial match of the URL on load
   */
  onloadEvent?: boolean;
};

/**
 * @public
 *
 * Extract params type from route object object
 */
export type Params<T> = T extends { params: infer TParams }
  ? TParams
  : undefined;

/**
 * @public
 *
 * Extract query type from route object
 */
export type Query<T> = T extends { query: infer TQuery } ? TQuery : undefined;

/**
 * @public
 *
 * Extract meta type from route object
 */
export type Meta<T> = T extends { meta: infer TMeta } ? TMeta : undefined;

/**
 * @public
 *
 * Extract params type from route
 */
export type RouteParams<T> = T extends Route<infer TParams, any, any, any>
  ? TParams
  : undefined;

/**
 * @public
 *
 * Extract meta type from route
 */
export type RouteMeta<T> = T extends Route<any, any, any, infer TMeta>
  ? TMeta
  : undefined;

type MergeRouteTypes<TBase, TSupplied> = undefined extends TBase
  ? TSupplied
  : undefined extends TSupplied
  ? TBase
  : TBase & TSupplied;

type ResolveZodType<T extends Z.ZodType<any> | undefined> = undefined extends T
  ? undefined
  : Z.TypeOf<Exclude<T, undefined>>;

/**
 * @public
 *
 * Creates a route factory
 *
 * @param history - the history object to use for this route factory, this needs to be the same one used in the trees root component
 * @param basePath - the base path for this route factory
 */
export function buildCreateRoute(history: XstateTreeHistory, basePath: string) {
  function navigate({
    history,
    url,
    meta,
  }: {
    history: XstateTreeHistory;
    url: string;
    meta: SharedMeta | undefined;
  }) {
    const method = meta?.replace ? history.replace : history.push;

    method(url, {
      meta,
      previousUrl: window.location.pathname,
    });
  }

  return {
    simpleRoute<TBaseRoute extends AnyRoute>(baseRoute?: TBaseRoute) {
      return <
        TEvent extends string,
        TParamsSchema extends Z.ZodObject<any> | undefined,
        TQuerySchema extends Z.ZodObject<any> | undefined,
        TMeta extends Record<string, unknown>
      >({
        url,
        paramsSchema,
        querySchema,
        ...args
      }: {
        event: TEvent;
        url: string;
        paramsSchema?: TParamsSchema;
        querySchema?: TQuerySchema;
        meta?: TMeta;
        redirect?: RouteRedirect<
          MergeRouteTypes<
            RouteParams<TBaseRoute>,
            ResolveZodType<TParamsSchema>
          >,
          ResolveZodType<TQuerySchema>,
          MergeRouteTypes<RouteMeta<TBaseRoute>, TMeta> & SharedMeta
        >;
      }): Route<
        MergeRouteTypes<RouteParams<TBaseRoute>, ResolveZodType<TParamsSchema>>,
        ResolveZodType<TQuerySchema>,
        TEvent,
        MergeRouteTypes<RouteMeta<TBaseRoute>, TMeta> & SharedMeta
      > => {
        const matcher = match(url, { end: false });
        const reverser = compile(url);

        return this.route(baseRoute)({
          ...args,
          paramsSchema,
          querySchema,
          // @ts-ignore :cry:
          matcher: (url, query) => {
            const match = matcher(url);

            if (match === false) {
              return false;
            }

            const params = match.params;
            if (params && paramsSchema) {
              paramsSchema.parse(params);
            }
            if (query && querySchema) {
              querySchema.parse(query);
            }

            return {
              matchLength: match.path.length,
              params,
              query,
            };
          },
          // @ts-ignore :cry:
          reverser: (args: any) => {
            const url = reverser(args.params);

            if (args.query) {
              return `${url}?${stringify(args.query)}`;
            }

            return url;
          },
        });
      };
    },
    route<TBaseRoute extends AnyRoute>(baseRoute?: TBaseRoute) {
      function getParentArray() {
        const parentRoutes: AnyRoute[] = [];

        let currentParent: AnyRoute | undefined =
          baseRoute as unknown as AnyRoute;
        while (currentParent) {
          parentRoutes.unshift(currentParent);
          currentParent = currentParent.parent;
        }

        return parentRoutes;
      }

      return <
        TEvent extends string,
        TParamsSchema extends Z.ZodObject<any> | undefined,
        TQuerySchema extends Z.ZodObject<any> | undefined,
        TMeta extends Record<string, unknown>
      >({
        event,
        matcher,
        reverser,
        paramsSchema,
        querySchema,
        redirect,
      }: {
        event: TEvent;
        paramsSchema?: TParamsSchema;
        querySchema?: TQuerySchema;
        meta?: TMeta;
        redirect?: RouteRedirect<
          MergeRouteTypes<
            RouteParams<TBaseRoute>,
            ResolveZodType<TParamsSchema>
          >,
          ResolveZodType<TQuerySchema>,
          MergeRouteTypes<RouteMeta<TBaseRoute>, TMeta> & SharedMeta
        >;
        /**
         * Determines if the route matches the given url and query
         *
         * If there is no match, return false
         * If there is a match, return the parsed params and query as well as the length of the matched path in the URL
         */
        matcher: (
          url: string,
          query: ParsedQuery<string> | undefined
        ) =>
          | (RouteArguments<
              MergeRouteTypes<
                RouteParams<TBaseRoute>,
                ResolveZodType<TParamsSchema>
              >,
              ResolveZodType<TQuerySchema>,
              MergeRouteTypes<RouteMeta<TBaseRoute>, TMeta>
            > & { matchLength: number })
          | false;
        /**
         * Reverses the route to a URL
         *
         * Supplied with params/query objects and constructs the correct URL based on them
         */
        reverser: RouteArgumentFunctions<
          string,
          MergeRouteTypes<
            RouteParams<TBaseRoute>,
            ResolveZodType<TParamsSchema>
          >,
          ResolveZodType<TQuerySchema>,
          MergeRouteTypes<RouteMeta<TBaseRoute>, TMeta>
        >;
      }): Route<
        MergeRouteTypes<RouteParams<TBaseRoute>, ResolveZodType<TParamsSchema>>,
        ResolveZodType<TQuerySchema>,
        TEvent,
        MergeRouteTypes<RouteMeta<TBaseRoute>, TMeta> & SharedMeta
      > => {
        let fullParamsSchema: Z.ZodObject<any> | undefined = paramsSchema;
        let parentRoute: AnyRoute | undefined =
          baseRoute as unknown as AnyRoute;
        while (fullParamsSchema && parentRoute) {
          if (parentRoute.paramsSchema) {
            fullParamsSchema = fullParamsSchema.merge(parentRoute.paramsSchema);
          }

          parentRoute = parentRoute.parent;
        }

        return {
          basePath,
          event,
          history,
          paramsSchema,
          querySchema,
          parent: baseRoute,
          redirect,
          matcher: matcher as any,
          reverser: reverser as any,
          // @ts-ignore :cry:
          getEvent(args: any) {
            const { params, query, meta } = args ?? {};

            return { type: event, params, query, meta };
          },
          // @ts-ignore :cry:
          matches(suppliedUrl: string, search: string) {
            const fullUrl = suppliedUrl.endsWith("/")
              ? suppliedUrl
              : suppliedUrl + "/";
            let url = fullUrl;

            const parentRoutes = getParentArray();
            let params: Record<string, unknown> = {};
            while (parentRoutes.length) {
              const parentRoute = parentRoutes.shift()!;

              const parentMatch = parentRoute.matcher(url, undefined);
              if (parentMatch === false) {
                return false;
              }

              url = url.slice(parentMatch.matchLength);
              // All routes assume the url starts with a /
              // so if the parent route matches the / in the url, which consumes it
              // need to re-add it for the next route to match against
              if (!url.startsWith("/")) {
                url = "/" + url;
              }

              params = { ...params, ...(parentMatch.params ?? {}) };
            }

            const matches = matcher(url, parse(search));

            // if there is any URL left after matching this route, the last to match
            // that means the match isn't actually a match
            if (matches === false || matches.matchLength !== url.length) {
              return false;
            }

            const fullParams = {
              ...params,
              ...((matches as any).params ?? {}),
            };
            if (fullParamsSchema) {
              fullParamsSchema.parse(fullParams);
            }
            if (querySchema) {
              querySchema.parse((matches as any).query);
            }

            return {
              originalUrl: `${fullUrl}${search}`,
              type: event,
              params: fullParams,
              query: (matches as any).query ?? {},
            };
          },
          // @ts-ignore :cry:
          reverse(args: any) {
            const { params, query } = args ?? {};

            const parentRoutes = getParentArray();
            const baseUrl = parentRoutes
              .map((route) => route.reverser({ params }))
              .reduce(
                (fullUrl, urlPartial) => joinRoutes(fullUrl, urlPartial),
                ""
              );

            return `${joinRoutes(baseUrl, reverser({ params, query } as any))}`;
          },
          // @ts-ignore :cry:
          navigate(args: any): void {
            const { params, query, meta } = args ?? {};
            const url = this.reverse({ params, query } as any);

            navigate({
              url: joinRoutes(this.basePath, url),
              meta,
              history: this.history,
            });
          },
        };
      };
    },
  };
}
