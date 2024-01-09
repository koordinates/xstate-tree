import { useActor } from "@xstate/react";
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
  Actor,
  AnyActor,
  ActorRefFrom,
  AnyEventObject,
  AnyActorRef,
} from "xstate";

import {
  AnyRoute,
  handleLocationChange,
  RoutingContext,
  RoutingEvent,
  SharedMeta,
  useInRoutingContext,
} from "./routing";
import { useActiveRouteEvents } from "./routing/providers";
import { GetSlotNames, Slot } from "./slots";
import { GlobalEvents, AnyXstateTreeMachine, XstateTreeHistory } from "./types";
import { useConstant } from "./useConstant";
import { useService } from "./useService";
import { assertIsDefined, isLikelyPageLoad, mergeMeta, toJSON } from "./utils";

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
  interpreter: AnyActor
) {
  return interpreter.sessionId;
}

const getViewForInterpreter = memoize(
  (interpreter: ActorRefFrom<AnyXstateTreeMachine>) => {
    return React.memo(function InterpreterView() {
      const activeRouteEvents = useActiveRouteEvents();

      useEffect(() => {
        if (activeRouteEvents) {
          activeRouteEvents.forEach((event) => {
            if (interpreter.getSnapshot().can(event)) {
              interpreter.send(event);
            }
          });
        }
      }, []);

      return <XstateTreeView actor={interpreter} />;
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { serializer: cacheKeyForInterpreter as any }
);

/**
 * @private
 */
export const getMultiSlotViewForChildren = memoize(
  (parent: ActorRefFrom<AnyXstateTreeMachine>, slot: string) => {
    return React.memo(function MultiSlotView() {
      const [_, children] = useService(parent);
      const interpreters = Object.values<AnyActorRef>(children);
      // Once the interpreter is stopped, initialized gets set to false
      // We don't want to render stopped interpreters
      const interpretersWeCareAbout = interpreters.filter((i) =>
        i.id.includes(slot)
      );

      return (
        <XstateTreeMultiSlotView
          childInterpreters={interpretersWeCareAbout as AnyActor[]}
        />
      );
    });
  },
  {
    serializer: (args) => `${cacheKeyForInterpreter(args[0])}-${args[1]}`,
  }
);

function useSlots<TSlots extends readonly Slot[]>(
  interpreter: ActorRefFrom<AnyXstateTreeMachine>,
  slots: GetSlotNames<TSlots>[]
): Record<GetSlotNames<TSlots>, React.ComponentType> {
  return useConstant(() => {
    return slots.reduce((views, slot) => {
      return {
        ...views,
        [slot]: () => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const [__, children] = useService(interpreter);

          if (slot.toString().endsWith("Multi")) {
            const MultiView = getMultiSlotViewForChildren(
              interpreter,
              slot.toLowerCase()
            );
            return <MultiView />;
          } else {
            const interpreterForSlot = children[`${slot.toLowerCase()}-slot`];

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
  childInterpreters: AnyActor[];
};
function XstateTreeMultiSlotView({
  childInterpreters,
}: XStateTreeMultiSlotViewProps) {
  console.log("XstateTreeMultiSlotView", childInterpreters);
  return (
    <>
      {childInterpreters.map((i) => (
        <XstateTreeView key={i.id} actor={i} />
      ))}
    </>
  );
}

type XStateTreeViewProps = {
  actor: ActorRefFrom<AnyXstateTreeMachine>;
};

/**
 * @internal
 */
export function XstateTreeView({ actor }: XStateTreeViewProps) {
  const [current] = useService(actor);
  const currentRef = useRef(current);
  currentRef.current = current;
  const selectorsRef = useRef<Record<string | symbol, unknown> | undefined>(
    undefined
  );

  const {
    slots: interpreterSlots,
    View,
    actions: actionsFactory,
    selectors: selectorsFactory,
  } = (actor as Actor<AnyXstateTreeMachine>).logic._xstateTree;
  const slots = useSlots<GetSlotNames<typeof interpreterSlots>>(
    actor,
    interpreterSlots.map((x) => x.name)
  );
  const canHandleEvent = useCallback(
    (e: AnyEventObject) => {
      return actor.getSnapshot().can(e);
    },
    [actor]
  );
  const inState = useCallback(
    (state: unknown) => {
      return currentRef.current?.matches(state) ?? false;
    },
    // This is needed because the inState function needs to be recreated if the
    // current state the machine is in changes. But _only_ then
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current?.value]
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
    return actionsFactory({
      send: actor.send,
      selectors: selectorsProxy,
    });
  });

  if (!current) {
    return null;
  }

  selectorsRef.current = selectorsFactory({
    ctx: current.context,
    canHandleEvent,
    // Workaround for type instantiation possibly infinite error
    inState: inState as any,
    meta: mergeMeta(current.getMeta()),
  });

  return (
    <View selectors={selectorsRef.current} actions={actions} slots={slots} />
  );
}

/**
 * @internal
 */
export function recursivelySend(service: AnyActorRef, event: GlobalEvents) {
  const children = Object.values<AnyActorRef>(
    service.getSnapshot().children
  ).filter((s) => s.id.includes("-slot"));

  // If the service can't handle the event, don't send it
  if (service.getSnapshot().can(event)) {
    try {
      service.send(event);
    } catch (e) {
      console.error(
        "Error sending event ",
        event,
        " to machine ",
        service.id,
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
  if (!machine._xstateTree) {
    throw new Error(
      "Root machine is not an xstate-tree machine, missing metadata"
    );
  }
  if (!machine._xstateTree.View) {
    throw new Error("Root machine has no associated view");
  }

  const RootComponent = function XstateTreeRootComponent() {
    const lastSnapshotsRef = useRef<Record<string, unknown>>({});
    const [_, __, interpreter] = useActor(machine, {
      inspect(event) {
        switch (event.type) {
          case "@xstate.actor":
            console.log(`[xstate-tree] actor spawned: ${event.actorRef.id}`);
            break;
          case "@xstate.event":
            console.log(
              `[xstate-tree] event: ${
                event.sourceRef ? event.sourceRef.id : "UNKNOWN"
              } -> ${event.event.type} -> ${event.actorRef.id}`,
              event.event
            );
            break;
          case "@xstate.snapshot":
            const lastSnapshot =
              lastSnapshotsRef.current[event.actorRef.sessionId];

            if (!lastSnapshot) {
              console.log(
                `[xstate-tree] initial snapshot: ${event.actorRef.id}`,
                toJSON(event.snapshot)
              );
            } else {
              console.log(
                `[xstate-tree] snapshot: ${event.actorRef.id} transitioning to`,
                toJSON(event.snapshot),
                "from",
                toJSON(lastSnapshot)
              );
            }

            lastSnapshotsRef.current[event.actorRef.sessionId] = event.snapshot;
            break;
        }
      },
      id: machine.config.id,
    });
    const [activeRoute, setActiveRoute] = useState<AnyRoute | undefined>(
      undefined
    );
    const activeRouteEventsRef = useRef<RoutingEvent<AnyRoute>[]>([]);
    const setActiveRouteEvents = (events: RoutingEvent<AnyRoute>[]) => {
      activeRouteEventsRef.current = events;
    };
    const insideRoutingContext = useInRoutingContext();
    if (insideRoutingContext && typeof routing !== "undefined") {
      const m =
        "Routing root rendered inside routing context, this implies a bug";
      if (process.env.NODE_ENV !== "production") {
        throw new Error(m);
      }

      console.error(m);
    }

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
          getPathName = () => routing.history.location.pathname,
          getQueryString = () => routing.history.location.search,
        } = routing;
        const initialMeta = {
          ...(routing.history.location.state?.meta ?? {}),
          onloadEvent: isLikelyPageLoad(),
        } as SharedMeta;

        const queryString = getQueryString();
        const result = handleLocationChange(
          routing.routes,
          routing.basePath,
          getPathName(),
          getQueryString(),
          initialMeta
        );

        if (result) {
          setActiveRouteEvents(result.events);
          setActiveRoute({ ...result.matchedRoute });
        }

        // Hack to ensure the initial location doesn't have undefined state
        // It's not supposed to, but it does for some reason
        // And the history library ignores popstate events with undefined state
        routing.history.replace(`${getPathName()}${queryString}`, {
          meta: initialMeta,
        });
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
      // Just to satisfy linter, need this memo to be re-calculated on route changes
      activeRoute;
      if (!routing) {
        return null;
      }

      return {
        activeRouteEvents: activeRouteEventsRef,
      };
    }, [activeRoute]);

    if (routingProviderValue) {
      return (
        <RoutingContext.Provider value={routingProviderValue}>
          <XstateTreeView actor={interpreter} />
        </RoutingContext.Provider>
      );
    } else {
      return <XstateTreeView actor={interpreter} />;
    }
  };

  RootComponent.rootMachine = machine;
  return RootComponent;
}
