import { createContext, MutableRefObject, useContext } from "react";

type RoutingContext = {
  activeRouteEvents?: MutableRefObject<any[]>;
};

export const RoutingContext = createContext<RoutingContext | undefined>(
  undefined
);

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
