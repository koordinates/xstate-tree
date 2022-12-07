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
