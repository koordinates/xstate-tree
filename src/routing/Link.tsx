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
  preloadOnInteraction?: boolean;
  preloadOnHoverMs?: number;
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
  preloadOnHoverMs,
  preloadOnInteraction,
  onMouseDown: _onMouseDown,
  onMouseEnter: _onMouseEnter,
  onMouseLeave: _onMouseLeave,
  ...rest
}: LinkProps<TRoute>) {
  // @ts-ignore, these fields _might_ exist, so typechecking doesn't believe they exist
  // and everything that consumes params/query already checks for undefined
  const { params, query, meta, ...props } = rest;

  let timeout: number | undefined;
  const href = useHref(to, params, query);
  const onMouseDown: React.MouseEventHandler<HTMLAnchorElement> | undefined =
    preloadOnInteraction
      ? (e) => {
          _onMouseDown?.(e);

          to.preload({ params, query, meta });
        }
      : undefined;
  const onMouseEnter: React.MouseEventHandler<HTMLAnchorElement> | undefined =
    preloadOnHoverMs !== undefined
      ? (e) => {
          _onMouseEnter?.(e);

          timeout = setTimeout(() => {
            to.preload({ params, query, meta });
          }, preloadOnHoverMs);
        }
      : undefined;
  const onMouseLeave: React.MouseEventHandler<HTMLAnchorElement> | undefined =
    preloadOnHoverMs !== undefined
      ? (e) => {
          _onMouseLeave?.(e);

          if (timeout !== undefined) {
            clearTimeout(timeout);
          }
        }
      : undefined;

  return (
    <a
      {...props}
      href={href}
      data-testid={testId}
      onMouseDown={onMouseDown ?? _onMouseDown}
      onMouseEnter={onMouseEnter ?? _onMouseEnter}
      onMouseLeave={onMouseLeave ?? _onMouseLeave}
      onClick={(e) => {
        e.preventDefault();
        if (props.onClick?.(e) === false) {
          return;
        }

        // Holding the Command key on Mac or the Control Key on Windows while clicking the link will open a new tab/window
        // TODO: add global callback to prevent this
        if (e.metaKey || e.ctrlKey) {
          return;
        }

        to.navigate({ params, query, meta });
      }}
    >
      {children}
    </a>
  );
}
