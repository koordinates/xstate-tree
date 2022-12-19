import React from "react";
import { createContext, MutableRefObject, useContext } from "react";

import { RoutingEvent } from "./routingEvent";

type Context = {
  activeRouteEvents?: MutableRefObject<RoutingEvent<any>[]>;
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

export function useActiveRouteEvents() {
  try {
    const context = useRoutingContext();

    return context.activeRouteEvents?.current;
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
  activeRouteEvents: RoutingEvent<any>[];
  children: React.ReactNode;
}) {
  return (
    <RoutingContext.Provider
      value={{ activeRouteEvents: { current: activeRouteEvents } }}
    >
      {children}
    </RoutingContext.Provider>
  );
}
