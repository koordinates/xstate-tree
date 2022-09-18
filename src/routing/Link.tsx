import React from "react";

import { AnyRoute, Route, RouteArguments } from "./createRoute";
import { useHref } from "./useHref";

/**
 * @public
 */
export type StyledLink<TStyleProps = {}> = <TRoute extends AnyRoute>(
  props: LinkProps<TRoute> & TStyleProps
) => JSX.Element;

/**
 * @public
 */
export type LinkProps<
  TRoute extends AnyRoute,
  TRouteParams = TRoute extends Route<infer TParams, any, any, any>
    ? TParams
    : undefined,
  TRouteQuery = TRoute extends Route<any, infer TQuery, any, any>
    ? TQuery
    : undefined,
  TRouteMeta = TRoute extends Route<any, any, any, infer TMeta>
    ? TMeta
    : undefined
> = {
  to: TRoute;
  children: React.ReactNode;
  testId?: string;

  /**
   * onClick works as normal, but if you return false from it the navigation will not happen
   */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => boolean | void;
} & RouteArguments<TRouteParams, TRouteQuery, TRouteMeta> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">;

/**
 * @public
 *
 * Renders an anchor tag pointing at the provided Route
 *
 * The query/params/meta props are conditionally required based on the
 * route passed as the To parameter
 */
export function Link<TRoute extends AnyRoute>({
  to,
  children,
  testId,
  ...rest
}: LinkProps<TRoute>) {
  // @ts-ignore, these fields _might_ exist, so typechecking doesn't believe they exist
  // and everything that consumes params/query already checks for undefined
  const { params, query, meta, ...props } = rest;

  const href = useHref(to, params, query);

  return (
    <a
      {...props}
      href={href}
      data-testid={testId}
      onClick={(e) => {
        if (props.onClick?.(e) === false) {
          return;
        }

        // Holding the Command key on Mac or the Control Key on Windows while clicking the link will open a new tab/window
        // TODO: add global callback to prevent this
        if (e.metaKey || e.ctrlKey) {
          return;
        }

        e.preventDefault();

        to.navigate({ params, query, meta });
      }}
    >
      {children}
    </a>
  );
}
