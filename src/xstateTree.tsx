import { useMachine } from "@xstate/react";
import memoize from "fast-memoize";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TinyEmitter } from "tiny-emitter";
import {
  EventObject,
  Typestate,
  Interpreter,
  InterpreterFrom,
  AnyInterpreter,
  AnyEventObject,
} from "xstate";

import {
  AnyRoute,
  handleLocationChange,
  RoutingContext,
  RoutingEvent,
  SharedMeta,
} from "./routing";
import { useActiveRouteEvents } from "./routing/providers";
import { GetSlotNames, Slot } from "./slots";
import { GlobalEvents, AnyXstateTreeMachine, XstateTreeHistory } from "./types";
import { useConstant } from "./useConstant";
import { useService } from "./useService";
import { assertIsDefined, isLikelyPageLoad } from "./utils";

export const emitter = new TinyEmitter();

/**
 * @public
 *
 * Broadcasts a global event to all xstate-tree machines
 *
 * @param event - the event to broadcast
 */
export function broadcast(event: GlobalEvents) {
  console.debug("[xstate-tree] broadcasting event ", (event as any).type);
  emitter.emit("event", event);
}

/**
 * @public
 *
 * Allows hooking in to the global events sent between machines
 *
 * @param handler - the handler to call when an event is broadcast
 */
export function onBroadcast(
  handler: (event: GlobalEvents) => void
): () => void {
  emitter.on("event", handler);

  return () => {
    emitter.off("event", handler);
  };
}

function cacheKeyForInterpreter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interpreter: Interpreter<any, any, any>
) {
  return interpreter.sessionId;
}

const getViewForInterpreter = memoize(
  (interpreter: AnyInterpreter) => {
    return React.memo(function InterpreterView() {
      const activeRouteEvents = useActiveRouteEvents();

      useEffect(() => {
        if (activeRouteEvents) {
          activeRouteEvents.forEach((event) => {
            if (interpreter.state.nextEvents.includes(event.type)) {
              interpreter.send(event);
            }
          });
        }
      }, []);

      return <XstateTreeView interpreter={interpreter} />;
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { serializer: cacheKeyForInterpreter as any }
);

const getMultiSlotViewForChildren = memoize(
  (parent: InterpreterFrom<AnyXstateTreeMachine>, slot: string) => {
    return React.memo(function MultiSlotView() {
      const [_, children] = useService(parent);
      const interpreters = [...children.values()];
      // Once the interpreter is stopped, initialized gets set to false
      // We don't want to render stopped interpreters
      const interpretersWeCareAbout = interpreters.filter(
        (i) => i.id.includes(slot) && i.initialized
      );

      return (
        <XstateTreeMultiSlotView childInterpreters={interpretersWeCareAbout} />
      );
    });
  },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serializer: ((interpreter: any, slot: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `${cacheKeyForInterpreter(interpreter)}-${slot}`) as any,
  }
);

function useSlots<TSlots extends readonly Slot[]>(
  interpreter: InterpreterFrom<AnyXstateTreeMachine>,
  slots: GetSlotNames<TSlots>[]
): Record<GetSlotNames<TSlots>, React.ComponentType> {
  return useConstant(() => {
    return slots.reduce((views, slot) => {
      return {
        ...views,
        [slot]: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const [__, children] = useService(interpreter);

          console.log(slot.toString());
          if (slot.toString().endsWith("Multi")) {
            const MultiView = getMultiSlotViewForChildren(
              interpreter,
              slot.toLowerCase()
            );
            return <MultiView />;
          } else {
            const interpreterForSlot = children.get(
              `${slot.toLowerCase()}-slot`
            );

            if (interpreterForSlot) {
              const View = getViewForInterpreter(interpreterForSlot);

              return <View />;
            } else {
              // Waiting for the interpreter for this slot to be invoked
              return null;
            }
          }
        },
      };
    }, {} as Record<GetSlotNames<TSlots>, React.ComponentType>);
  });
}

type XStateTreeMultiSlotViewProps = {
  childInterpreters: AnyInterpreter[];
};
function XstateTreeMultiSlotView({
  childInterpreters,
}: XStateTreeMultiSlotViewProps) {
  return (
    <>
      {childInterpreters.map((i) => (
        <XstateTreeView key={i.id} interpreter={i} />
      ))}
    </>
  );
}

type XStateTreeViewProps = {
  interpreter: InterpreterFrom<AnyXstateTreeMachine>;
};

/**
 * @internal
 */
export function XstateTreeView({ interpreter }: XStateTreeViewProps) {
  const [current] = useService(interpreter);
  const currentRef = useRef(current);
  currentRef.current = current;
  const selectorsRef = useRef<Record<string | symbol, unknown> | undefined>(
    undefined
  );

  const {
    view: View,
    actions: actionsFactory,
    selectors: selectorsFactory,
    slots: interpreterSlots,
  } = interpreter.machine.meta!;
  const slots = useSlots<GetSlotNames<typeof interpreterSlots>>(
    interpreter,
    interpreterSlots.map((x) => x.name)
  );
  const canHandleEvent = useCallback(
    (e: AnyEventObject) => {
      return interpreter.nextState(e).changed ?? false;
    },
    [interpreter]
  );
  const inState = useCallback(
    (state: unknown) => {
      return currentRef.current?.matches(state) ?? false;
    },
    // This is needed because the inState function needs to be recreated if the
    // current state the machine is in changes. But _only_ then
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current.value]
  );
  const selectorsProxy = useConstant(() => {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          return selectorsRef.current?.[prop];
        },
      }
    );
  });
  const actions = useConstant(() => {
    return actionsFactory(interpreter.send, selectorsProxy);
  });

  if (!current) {
    return null;
  }

  const selectors = selectorsFactory(
    current.context,
    canHandleEvent,
    inState,
    current.value
  );
  selectorsRef.current = selectors;

  return (
    <View
      selectors={selectors}
      actions={actions}
      slots={slots}
      inState={inState}
    />
  );
}

/**
 * @internal
 */
export function recursivelySend<
  TContext,
  TEvent extends EventObject,
  TTypeState extends Typestate<TContext>
>(
  service: Interpreter<TContext, any, TEvent, TTypeState, any>,
  event: GlobalEvents
) {
  const children = ([...service.children.values()] || []).filter((s) =>
    s.id.includes("-slot")
  ) as unknown as Interpreter<any, any, any, any>[];

  // If the service can't handle the event, don't send it
  if (service.state.nextEvents.includes((event as any).type)) {
    try {
      service.send(event as any);
    } catch (e) {
      console.error(
        "Error sending event ",
        event,
        " to machine ",
        service.machine.id,
        e
      );
    }
  }
  children.forEach((child) => recursivelySend(child, event));
}

/**
 * @public
 *
 * Builds a React host component for the root machine of an xstate-tree
 *
 * @param machine - The root machine of the tree
 * @param routing - The routing configuration for the tree
 */
export function buildRootComponent(
  machine: AnyXstateTreeMachine,
  routing?: {
    routes: AnyRoute[];
    history: XstateTreeHistory<any>;
    basePath: string;
    getPathName?: () => string;
    getQueryString?: () => string;
  }
) {
  if (!machine.meta) {
    throw new Error("Root machine has no meta");
  }
  if (!machine.meta.view) {
    throw new Error("Root machine has no associated view");
  }

  const RootComponent = function XstateTreeRootComponent() {
    const [_, __, interpreter] = useMachine(machine, { devTools: true });
    const [activeRoute, setActiveRoute] = useState<AnyRoute | undefined>(
      undefined
    );
    const activeRouteEventsRef = useRef<RoutingEvent<any>[]>([]);
    const [forceRenderValue, forceRender] = useState(false);
    const setActiveRouteEvents = (events: RoutingEvent<any>[]) => {
      activeRouteEventsRef.current = events;
    };

    useEffect(() => {
      function handler(event: GlobalEvents) {
        recursivelySend(interpreter, event);
      }

      emitter.on("event", handler);

      return () => {
        emitter.off("event", handler);
      };
    }, [interpreter]);

    useEffect(() => {
      if (activeRoute === undefined) {
        return;
      }

      const controller = new AbortController();
      const routes: AnyRoute[] = [activeRoute];

      let route: AnyRoute = activeRoute;
      while (route.parent) {
        routes.unshift(route.parent);
        route = route.parent;
      }

      const routeEventPairs: [AnyRoute, RoutingEvent<any>][] = [];
      const activeRoutesEvent = activeRouteEventsRef.current.find(
        (e) => e.type === activeRoute.event
      );
      assertIsDefined(activeRoutesEvent);

      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const routeEvent = activeRouteEventsRef.current[i];
        routeEventPairs.push([route, routeEvent]);
      }

      const routePairsWithRedirects = routeEventPairs.filter(([route]) => {
        return route.redirect !== undefined;
      });

      const redirectPromises = routePairsWithRedirects.map(([route, event]) => {
        assertIsDefined(route.redirect);

        return route.redirect({
          signal: controller.signal,
          query: event.query,
          params: event.params,
          meta: event.meta,
        });
      });

      void Promise.all(redirectPromises).then((redirects) => {
        const didAnyRedirect = redirects.some((x) => x !== undefined);

        if (!didAnyRedirect || controller.signal.aborted) {
          return;
        }

        const routeArguments = redirects.reduce(
          (args, redirect) => {
            if (redirect) {
              args.query = { ...args.query, ...redirect.query };
              args.params = { ...args.params, ...redirect.params };
              args.meta = { ...args.meta, ...redirect.meta };
            }

            return args;
          },
          {
            // since the redirect results are partials, need to merge them with the original event
            // params/query to ensure that all params/query are present
            query: { ...((activeRoutesEvent.query as any) ?? {}) },
            params: { ...((activeRoutesEvent.params as any) ?? {}) },
            meta: { replace: true, ...((activeRoutesEvent.meta as any) ?? {}) },
          }
        );

        activeRoute.navigate(routeArguments);
      });

      return () => {
        controller.abort();
      };
    }, [activeRoute]);

    useEffect(() => {
      if (routing) {
        const {
          getPathName = () => window.location.pathname,
          getQueryString = () => window.location.search,
        } = routing;

        const queryString = getQueryString();
        const result = handleLocationChange(
          routing.routes,
          routing.basePath,
          getPathName(),
          getQueryString(),
          { onloadEvent: isLikelyPageLoad() } as SharedMeta
        );

        if (result) {
          setActiveRouteEvents(result.events);
          setActiveRoute({ ...result.matchedRoute });
        }

        // Hack to ensure the initial location doesn't have undefined state
        // It's not supposed to, but it does for some reason
        // And the history library ignores popstate events with undefined state
        routing.history.replace(`${getPathName()}${queryString}`, {});
      }
    }, []);

    useEffect(() => {
      if (routing) {
        const unsub = routing.history.listen((location) => {
          const result = handleLocationChange(
            routing.routes,
            routing.basePath,
            location.pathname,
            location.search,
            location.state?.meta
          );

          if (result) {
            setActiveRouteEvents(result.events);
            setActiveRoute({ ...result.matchedRoute });
          }
        });

        return () => {
          unsub();
        };
      }

      return undefined;
    }, []);

    const routingProviderValue = useMemo(() => {
      if (!routing) {
        return null;
      }

      return {
        activeRouteEvents: activeRouteEventsRef,
      };
    }, []);

    if (!interpreter.initialized) {
      setTimeout(() => forceRender(!forceRenderValue), 0);
      return null;
    }

    if (routingProviderValue) {
      return (
        <RoutingContext.Provider value={routingProviderValue}>
          <XstateTreeView interpreter={interpreter} />
        </RoutingContext.Provider>
      );
    } else {
      return <XstateTreeView interpreter={interpreter} />;
    }
  };

  RootComponent.rootMachine = machine;
  return RootComponent;
}
