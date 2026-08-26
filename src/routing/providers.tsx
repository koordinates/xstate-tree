import React from "react";
import { createContext, MutableRefObject, useContext } from "react";

import { AnyRoute } from "./createRoute";
import { RoutingEvent } from "./routingEvent";

type Context = {
  /**
   * The events driving "is this route active" UI. A host can freeze these with
   * `shouldBlockActiveRouteUpdate` to keep a background page's navigation highlighted while an
   * overlay owns the URL.
   */
  activeRouteEvents?: MutableRefObject<RoutingEvent<AnyRoute>[]>;
  /**
   * The events for the URL actually matched, never frozen. This is what mount-time replay reads:
   * a machine mounting into an overlay needs the route it is being opened on, not the one the
   * host is keeping highlighted behind it. Falls back to `activeRouteEvents` when a provider
   * does not distinguish them.
   */
  latestRouteEvents?: MutableRefObject<RoutingEvent<AnyRoute>[]>;
  isTestRoutingContext?: boolean;
};

export const RoutingContext = createContext<Context | undefined>(undefined);

function useRoutingContext() {
  const context = useContext(RoutingContext);

  if (context === undefined) {
    throw new Error(
      "useRoutingContext must be used within a RoutingContext provider"
    );
  }

  return context;
}

/**
 * @private
 */
export function useInRoutingContext(): boolean {
  const context = useContext(RoutingContext);

  return context !== undefined;
}

/**
 * @private
 */
export function useInTestRoutingContext(): boolean {
  const context = useContext(RoutingContext);

  return context?.isTestRoutingContext ?? false;
}

/**
 * @public
 *
 * Returns the list of active routing events, or undefined if there are none / used outside of an xstate-tree routing context
 */
export function useActiveRouteEvents() {
  try {
    const context = useRoutingContext();

    return context.activeRouteEvents?.current;
  } catch {
    return undefined;
  }
}

/**
 * @private
 *
 * The events for the URL actually matched, ignoring any `shouldBlockActiveRouteUpdate` freeze.
 * Used by mount-time route replay, which must deliver the real route even while the host is
 * deliberately keeping `activeRouteEvents` pinned to a background page.
 */
export function useLatestRouteEvents() {
  try {
    const context = useRoutingContext();

    return (context.latestRouteEvents ?? context.activeRouteEvents)?.current;
  } catch {
    return undefined;
  }
}

/**
 * @public
 *
 * Renders the xstate-tree routing context. Designed for use in tests/storybook
 * for components that make use of routing hooks but aren't part of an xstate-tree view
 *
 * @param activeRouteEvents - The active route events to use in the context
 */
export function TestRoutingContext({
  activeRouteEvents,
  children,
}: {
  activeRouteEvents: RoutingEvent<AnyRoute>[];
  children: React.ReactNode;
}) {
  return (
    <RoutingContext.Provider
      value={{
        activeRouteEvents: { current: activeRouteEvents },
        isTestRoutingContext: true,
      }}
    >
      {children}
    </RoutingContext.Provider>
  );
}
