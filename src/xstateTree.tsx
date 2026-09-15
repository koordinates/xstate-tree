import { useActor } from "@xstate/react";
import memoize from "fast-memoize";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  InputFrom,
} from "xstate";

import {
  AnyRoute,
  handleLocationChange,
  RoutingContext,
  RoutingEvent,
  SharedMeta,
  useInRoutingContext,
  useInTestRoutingContext,
  useLatestRouteEvents,
} from "./routing";
import { GetSlotNames, Slot } from "./slots";
import { GlobalEvents, AnyXstateTreeMachine, XstateTreeHistory } from "./types";
import { useConstant } from "./useConstant";
import { useService } from "./useService";
import {
  assertIsDefined,
  mergeMeta,
  toJSON,
  type IsUnknown,
  type MarkOptionalLikePropertiesOptional,
} from "./utils";

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
    return React.memo(function InterpreterView({
      children,
    }: {
      children?: React.ReactNode;
    }) {
      // Latest, not active: a child mounting into an overlay needs the route it is being opened
      // on, even while the host keeps `activeRouteEvents` pinned to the page behind it.
      const latestRouteEvents = useLatestRouteEvents();

      // Layout, not passive: an update scheduled from a passive effect is only rendered after the
      // browser has painted, so replaying here would first paint the child in its unrouted initial
      // state. From a layout effect the resulting re-render is flushed before paint.
      // `XstateTreeView` below subscribes in a layout effect too, and child effects run first, so
      // it is already listening when this sends.
      useLayoutEffect(() => {
        if (latestRouteEvents) {
          latestRouteEvents.forEach((event) => {
            if (interpreter.getSnapshot().can(event)) {
              interpreter.send(event);
            }
          });
        }
      }, []);

      return <XstateTreeView actor={interpreter}>{children}</XstateTreeView>;
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
): Record<
  GetSlotNames<TSlots>,
  React.ComponentType<{ children?: React.ReactNode }>
> {
  return useConstant(() => {
    return slots.reduce((views, slot) => {
      return {
        ...views,
        [slot]: (({ children: reactChildren }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const [__, children] = useService(interpreter);

          if (slot.toString().endsWith("Multi")) {
            const MultiView = getMultiSlotViewForChildren(
              interpreter,
              slot.toLowerCase()
            );
            return <MultiView />;
          } else {
            const slotPrefix = `${slot.toLowerCase()}-`;
            const childKey = Object.keys(children).find(
              (key) => key.startsWith(slotPrefix) && key.endsWith("-slot")
            );
            const interpreterForSlot = childKey
              ? children[childKey]
              : undefined;

            if (interpreterForSlot) {
              const View = getViewForInterpreter(interpreterForSlot);

              return <View>{reactChildren}</View>;
            } else {
              // Waiting for the interpreter for this slot to be invoked
              return null;
            }
          }
        }) as React.ComponentType<{ children?: React.ReactNode }>,
      };
    }, {} as Record<GetSlotNames<TSlots>, React.ComponentType<{ children?: React.ReactNode }>>);
  });
}

type XStateTreeMultiSlotViewProps = {
  childInterpreters: AnyActor[];
};
function XstateTreeMultiSlotView({
  childInterpreters,
}: XStateTreeMultiSlotViewProps) {
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
  children?: React.ReactNode;
};

/**
 * @internal
 */
export function XstateTreeView({ actor, children }: XStateTreeViewProps) {
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
    <View selectors={selectorsRef.current} actions={actions} slots={slots}>
      {children}
    </View>
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
 * The route the root is currently on, together with the routing events it was
 * matched from. Kept as one value so the two can never be read out of step.
 */
interface ActiveRoute {
  route: AnyRoute;
  events: RoutingEvent<AnyRoute>[];
}

type RootOptions<TInput> = {
  routing:
    | {
        routes: AnyRoute[];
        history: XstateTreeHistory<any>;
        basePath: string;
        getPathName?: () => string;
        getQueryString?: () => string;
        shouldBlockActiveRouteUpdate?: (event: RoutingEvent<any>) => boolean;
      }
    | undefined;
  input: IsUnknown<TInput> extends true ? undefined : TInput;
};
/**
 * @public
 *
 * Builds a React host component for the root machine of an xstate-tree
 *
 * @param machine - The root machine of the tree
 * @param routing - The routing configuration for the tree
 */
export function buildRootComponent<TMachine extends AnyXstateTreeMachine>(
  options: { machine: TMachine } & MarkOptionalLikePropertiesOptional<
    RootOptions<InputFrom<TMachine>>
  >
) {
  const { input, machine, routing } = options as unknown as {
    machine: TMachine;
  } & RootOptions<InputFrom<TMachine>>;
  if (!machine._xstateTree) {
    throw new Error(
      "Root machine is not an xstate-tree machine, missing metadata"
    );
  }
  if (!machine._xstateTree.View) {
    throw new Error("Root machine has no associated view");
  }

  const RootComponent = function XstateTreeRootComponent({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    const lastSnapshotsRef = useRef<Record<string, unknown>>({});
    const [_, __, interpreter] = useActor(machine, {
      input,
      inspect(event) {
        switch (event.type) {
          case "@xstate.actor":
            console.log(`[xstate-tree] actor spawned: ${event.actorRef.id}`);
            break;
          case "@xstate.event":
            // Ignore internal events
            if (event.event.type.includes("xstate.")) {
              return;
            }

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

            const strippedKeys = ["_subscription"];
            if (!lastSnapshot) {
              console.log(
                `[xstate-tree] initial snapshot: ${event.actorRef.id}`,
                toJSON(event.snapshot, strippedKeys)
              );
            } else {
              console.log(
                `[xstate-tree] snapshot: ${event.actorRef.id} transitioning to`,
                toJSON(event.snapshot, strippedKeys),
                "from",
                toJSON(lastSnapshot, strippedKeys)
              );
            }

            lastSnapshotsRef.current[event.actorRef.sessionId] = event.snapshot;
            break;
        }
      },
      id: machine.config.id,
    });
    // The route and the events it was matched from are stored together so they
    // can't drift apart. They used to be a state/ref pair, which drifts whenever
    // a navigation lands between a render and its passive effects - a slotted
    // child navigating from `getViewForInterpreter`'s mount-time route replay
    // does exactly that, because passive effects run child-first.
    const [activeRoute, setActiveRoute] = useState<ActiveRoute | undefined>(
      undefined
    );
    // The context still exposes a ref, because descendants mounting part way
    // through a navigation need the latest events, not the ones from the render
    // they mounted in.
    const activeRouteEventsRef = useRef<RoutingEvent<AnyRoute>[]>([]);
    // The events for the URL actually matched. `shouldBlockActiveRouteUpdate` freezes
    // `activeRouteEventsRef` so the host can keep a background page's nav highlighted, but the
    // replay still has to deliver the real route to anything mounting into the overlay - so that
    // freeze must not reach this ref.
    const latestRouteEventsRef = useRef<RoutingEvent<AnyRoute>[]>([]);
    const setLatestRouteEvents = (events: RoutingEvent<AnyRoute>[]) => {
      latestRouteEventsRef.current = events;
    };
    const setActiveRouteAndEvents = (
      route: AnyRoute,
      events: RoutingEvent<AnyRoute>[]
    ) => {
      activeRouteEventsRef.current = events;
      setActiveRoute({ route: { ...route }, events });
    };
    // The events of the routing context this root is NESTED inside, if any. A routing root reads
    // no ancestor context, so this is undefined for it and the replay below is a no-op.
    const ancestorRouteEvents = useLatestRouteEvents();
    const insideRoutingContext = useInRoutingContext();
    const inTestRoutingContext = useInTestRoutingContext();
    if (
      !inTestRoutingContext &&
      insideRoutingContext &&
      typeof routing !== "undefined"
    ) {
      const m =
        "Routing root rendered inside routing context, this implies a bug";
      if (process.env.NODE_ENV !== "production") {
        throw new Error(m);
      }

      console.error(m);
    }

    // Mount-time route replay, the same one `getViewForInterpreter` does for slotted children.
    // A bare root renders its machine through `XstateTreeView`, which never calls
    // `getViewForInterpreter`, so without this a root nested in someone else's routing context
    // never hears the route that mounted it - the broadcast fired before it existed.
    //
    // This cannot double-deliver alongside the broadcast. A root alive at boot mounts before the
    // routing root has resolved the URL, so there is nothing to replay yet and the broadcast is
    // the only delivery; a root that mounts later missed the broadcast entirely and the replay is
    // the only delivery.
    //
    // Layout, not passive, for the same reason as the slot replay: a root that mounts in response
    // to a navigation would otherwise paint its unrouted initial state first. `useActor` only
    // starts the actor from a passive effect, and an unstarted actor queues what it is sent until
    // then, so start it here - `start()` is a no-op once `useActor` gets to it.
    useLayoutEffect(() => {
      const actor = interpreter as AnyActorRef;
      actor.start();

      ancestorRouteEvents?.forEach((event) => {
        if (actor.getSnapshot().can(event)) {
          actor.send(event);
        }
      });
      // Deliberately mount-only, matching the slot replay.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Layout, not passive. Effects run in tree order, so a root rendered after a
    // routing root would otherwise still be unsubscribed when that routing root
    // broadcasts the initial route from its own (passive) effect, and would miss
    // it entirely. Subscribing during the layout phase gets every root attached
    // before any broadcast a passive effect makes.
    useLayoutEffect(() => {
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

      const { route: matchedRoute, events } = activeRoute;
      const controller = new AbortController();
      const routes: AnyRoute[] = [matchedRoute];

      let route: AnyRoute = matchedRoute;
      while (route.parent) {
        routes.unshift(route.parent);
        route = route.parent;
      }

      const activeRoutesEvent = events.find(
        (e) => e.type === matchedRoute.event
      );

      // Can't happen now the route and its events are set together, but this
      // effect runs on every navigation and a throw here takes the whole app
      // down - there is no error boundary above a routing root.
      if (!activeRoutesEvent) {
        console.error(
          "[xstate-tree] no routing event for the active route, skipping redirects",
          matchedRoute.event
        );
        return;
      }

      // Matched by event type rather than by index. `handleLocationChange`
      // returns the parent events in the opposite order to the parent chain
      // walked above, so pairing them positionally mismatched everything but the
      // leaf once a route was more than two levels deep.
      const routeEventPairs: [AnyRoute, RoutingEvent<any>][] = [];
      for (const route of routes) {
        const routeEvent = events.find((e) => e.type === route.event);

        if (routeEvent) {
          routeEventPairs.push([route, routeEvent]);
        }
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

        matchedRoute.navigate(routeArguments);
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
          onloadEvent: true,
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
          const matchedEvent = result.events[result.events.length - 1];
          const block =
            routing.shouldBlockActiveRouteUpdate?.(matchedEvent) === true;
          // Always, blocked or not - the block only freezes route-ACTIVE UI.
          setLatestRouteEvents(result.events);
          if (!block) {
            setActiveRouteAndEvents(result.matchedRoute, result.events);
          }
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
            const matchedEvent = result.events[result.events.length - 1];
            const block =
              routing.shouldBlockActiveRouteUpdate?.(matchedEvent) === true;
            // Always, blocked or not - the block only freezes route-ACTIVE UI.
            setLatestRouteEvents(result.events);
            if (!block) {
              setActiveRouteAndEvents(result.matchedRoute, result.events);
            }
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
        latestRouteEvents: latestRouteEventsRef,
      };
    }, [activeRoute]);

    if (routingProviderValue) {
      return (
        <RoutingContext.Provider value={routingProviderValue}>
          <XstateTreeView actor={interpreter}>{children}</XstateTreeView>
        </RoutingContext.Provider>
      );
    } else {
      return <XstateTreeView actor={interpreter}>{children}</XstateTreeView>;
    }
  };

  RootComponent.rootMachine = machine;
  return RootComponent;
}
