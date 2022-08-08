import { isNil } from "lodash";
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

/**
 * @public
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
    | undefined;

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
  event: TEvent;
  url?: string;
  history: XstateTreeHistory;
  basePath: string;
  parent?: AnyRoute;
  paramsSchema?: Z.ZodObject<any>;
  querySchema?: Z.ZodObject<any>;
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
  url?: string;
  basePath: string;
  history: XstateTreeHistory;
  parent?: AnyRoute;
  paramsSchema?: Z.ZodObject<any>;
  querySchema?: Z.ZodObject<any>;
};

/**
 * @public
 */
export type Options<
  TParamsSchema extends Z.ZodObject<any>,
  TQuerySchema extends Z.ZodObject<any>,
  TMetaSchema
> = {
  params?: TParamsSchema;
  query?: TQuerySchema;
  meta?: TMetaSchema;
};

/**
 * @public
 */
export type SharedMeta = {
  /**
   * Suppresses this routing change event from being picked up by react-router
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
 */
export type Params<T> = T extends { params: infer TParams }
  ? TParams
  : undefined;

/**
 * @public
 */
export type Query<T> = T extends { query: infer TQuery } ? TQuery : undefined;

/**
 * @public
 */
export type Meta<T> = T extends { meta: infer TMeta } ? TMeta : undefined;

/**
 * @public
 */
export type RouteParams<T> = T extends Route<infer TParams, any, any, any>
  ? TParams
  : undefined;

/**
 * @public
 */
export type RouteMeta<T> = T extends Route<any, any, any, infer TMeta>
  ? TMeta
  : undefined;

/**
 * @public
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
    /**
     * Creates a dynamic Route using the supplied options
     *
     * The return value of dynamicRoute is a function that accepts the routes "dynamic" options
     * The argument to dynamicRoute itself is the params/query/meta schemas defining the route
     *
     * The returned function accepts a singular option object with the following fields
     *
     * `event`, the string constant for the routes event
     * `matches`, a function that is passed a url/query string and determines if the route matches
     * if the route is matched it returns the extracted params/query objects
     * `reverse`, a function that is passed params/query objects and turns them into a URL
     *
     * The params and query schemas are ZodSchemas, they both need to be an object (ie Z.object())
     */
    dynamicRoute: function createDynamicRoute<
      TOpts extends Options<Z.ZodObject<any>, Z.ZodObject<any>, any>
    >(opts?: TOpts) {
      return <
        TEvent extends string,
        TParamsSchema = Params<TOpts>,
        TQuerySchema = Query<TOpts>,
        TMeta = Meta<TOpts>,
        TParams = TParamsSchema extends Z.ZodObject<any>
          ? Z.TypeOf<TParamsSchema>
          : undefined,
        TQuery = TQuerySchema extends Z.ZodObject<any>
          ? Z.TypeOf<TQuerySchema>
          : undefined,
        TFullMeta = TMeta extends undefined ? SharedMeta : TMeta & SharedMeta
      >({
        event,
        matches,
        reverse,
      }: {
        event: TEvent;
        matches: (
          url: string,
          query: ParsedQuery<string>
        ) => RouteArguments<TParams, TQuery, TFullMeta> | false;
        reverse: RouteArgumentFunctions<string, TParams, TQuery, TFullMeta>;
      }): Route<TParams, TQuery, TEvent, TFullMeta> => {
        return {
          paramsSchema: opts?.params,
          querySchema: opts?.query,
          event,
          history,
          basePath,
          parent: undefined,
          // @ts-ignore the usual
          getEvent({ params, query, meta } = {}) {
            return { type: event, params, query, meta };
          },
          // @ts-ignore not sure how to type this
          matches(url, search) {
            const query = parse(search);
            const match = matches(url, query);

            if (match === false) {
              return undefined;
            }

            if (opts?.params && "params" in match) {
              opts.params.parse(match.params);
            }
            if (opts?.query && "query" in match) {
              opts.query.parse(match.query);
            }

            return { type: event, originalUrl: `${url}${search}`, ...match };
          },
          // @ts-ignore not sure how to type this correctly
          // The types from external to this function are correct however
          reverse({ params, query } = {}): string {
            return reverse({ params, query } as any);
          },
          // @ts-ignore not sure how to type this correctly
          // The types from external to this function are correct however
          navigate({ params, query, meta } = {}): void {
            // @ts-ignore same problem
            const url = this.reverse({ params, query });

            navigate({
              url: joinRoutes(this.basePath, url),
              meta,
              history: this.history,
            });
          },
        };
      };
    },
    /**
     * Creates a static Route using the supplied options
     *
     * The return value of staticRoute is a function that accepts the routes options
     * The only argument to staticRoute itself is an optional parent route
     *
     * The returned function accepts 3 arguments
     *
     * 1. URL of the route
     * 2. The event type of the route
     * 3. The routes options, params schema, query schema and meta type
     *
     * The params and query schemas are ZodSchemas, they both need to be an object (ie Z.object())
     *
     * When creating a route that has a parent route, the following happens
     *
     * 1. The parent routes url is prepended to the routes URL
     * 2. The parents params schema is merged with the routes schema
     * 3. The parents meta type is merged with the routes meta type
     */
    staticRoute: function createStaticRoute<
      TBaseRoute extends AnyRoute | undefined = undefined,
      TBaseParams = RouteParams<TBaseRoute>,
      TBaseMeta = RouteMeta<TBaseRoute>
    >(baseRoute?: TBaseRoute) {
      return <
        TOpts extends Options<Z.ZodObject<any>, Z.ZodObject<any>, any>,
        TEvent extends string,
        TParamsSchema = Params<TOpts>,
        TQuerySchema = Query<TOpts>,
        TMeta = Meta<TOpts>,
        TParams = TParamsSchema extends Z.ZodObject<any>
          ? Z.TypeOf<TParamsSchema>
          : undefined,
        TQuery = TQuerySchema extends Z.ZodObject<any>
          ? Z.TypeOf<TQuerySchema>
          : undefined,
        TFullParams = TParams extends undefined
          ? TBaseParams extends undefined
            ? undefined
            : TBaseParams
          : TParams & (TBaseParams extends undefined ? {} : TBaseParams),
        TFullMeta = TMeta extends undefined
          ? TBaseMeta extends undefined
            ? SharedMeta
            : TBaseMeta & SharedMeta
          : TMeta & (TBaseMeta extends undefined ? {} : TBaseMeta) & SharedMeta
      >(
        url: string,
        event: TEvent,
        opts?: TOpts
      ): Route<TFullParams, TQuery, TEvent, TFullMeta> => {
        if (baseRoute && isNil(baseRoute.url)) {
          throw new Error(
            "Somehow constructing a route with a base route missing a URL, did you pass a dynamic route?"
          );
        }

        const urlWithTrailingSlash = url.endsWith("/") ? url : `${url}/`;
        const fullUrl = baseRoute
          ? joinRoutes(baseRoute.url!, urlWithTrailingSlash)
          : urlWithTrailingSlash;
        const matcher = match(fullUrl, {});
        const reverser = compile(fullUrl);
        const paramsSchema = baseRoute?.paramsSchema
          ? opts?.params
            ? baseRoute.paramsSchema.merge(opts.params)
            : baseRoute.paramsSchema
          : opts?.params
          ? opts.params
          : undefined;

        return {
          paramsSchema,
          querySchema: opts?.query,
          event,
          history,
          basePath,
          url: fullUrl,
          parent: baseRoute,
          // @ts-ignore the usual
          getEvent({ params, query, meta } = {}) {
            return { type: event, params, query, meta };
          },
          // @ts-ignore not sure how to type this
          matches(url, search) {
            const fullUrl = url.endsWith("/") ? url : `${url}/`;
            const matches = matcher(fullUrl);

            if (matches === false) {
              return undefined;
            }

            const params = matches.params;
            if (params && paramsSchema) {
              paramsSchema.parse(params);
            }
            const query = parse(search);
            if (opts?.query) {
              opts.query.parse(query);
            }

            return {
              type: event,
              originalUrl: `${fullUrl}${search}`,
              params,
              query,
            };
          },
          // @ts-ignore not sure how to type this correctly
          // The types from external to this function are correct however
          reverse({ params, query } = {}): string {
            const url = (() => {
              if (params) {
                // @ts-ignore same problem
                return reverser(params);
              } else {
                return reverser();
              }
            })();

            if (!isNil(query)) {
              return `${url}?${stringify(query)}`;
            } else {
              return url;
            }
          },
          // @ts-ignore not sure how to type this correctly
          // The types from external to this function are correct however
          navigate({ params, query, meta } = {}): void {
            // @ts-ignore same problem
            const url = this.reverse({ params, query });

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
