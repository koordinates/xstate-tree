import { useState, useRef, useEffect } from "react";
import {
  EventObject,
  ActorRefFrom,
  AnyMachineSnapshot,
  AnyActorRef,
  SnapshotFrom,
} from "xstate";

import { AnyXstateTreeMachine } from "./types";
import { isEqual } from "./utils";

/**
 * @public
 */
export function loggingMetaOptions<TEvents extends EventObject, TContext>(
  ignoredEvents: TEvents["type"][],
  ignoreContext: (keyof TContext)[] | undefined = undefined
) {
  const ignoredEventMap = new Map<string, boolean>();

  ignoredEvents.forEach((event) => {
    ignoredEventMap.set(event, true);
  });

  return {
    xstateTree: {
      ignoredEvents: ignoredEventMap,
      ignoreContext,
    },
  };
}

/**
 * @internal
 */
export function useService<
  TInterpreter extends ActorRefFrom<AnyXstateTreeMachine>
>(
  service: TInterpreter
): [
  current: SnapshotFrom<AnyXstateTreeMachine>,
  children: Record<string, AnyActorRef>
] {
  const [current, setCurrent] = useState(service.getSnapshot());
  const [children, setChildren] = useState<Record<string, AnyActorRef>>(
    service.getSnapshot().children
  );
  const childrenRef = useRef<Record<string, AnyActorRef>>({});

  useEffect(() => {
    childrenRef.current = children;
  }, [children]);

  useEffect(
    function () {
      // Set to current service state as there is a possibility
      // of a transition occurring between the initial useState()
      // initialization and useEffect() commit.
      setCurrent(service.getSnapshot());
      setChildren(service.getSnapshot().children);
      const listener = function (snapshot: AnyMachineSnapshot) {
        setCurrent(snapshot);
        setChildren(service.getSnapshot().children);
      };
      const sub = service.subscribe(listener);
      return function () {
        sub.unsubscribe();
      };
    },
    [service, setChildren]
  );
  // useEffect(() => {
  //   function handler(event: EventObject) {
  //     if (event.type.includes("done")) {
  //       const idOfFinishedChild = event.type.split(".")[2];
  //       childrenRef.current.delete(idOfFinishedChild);
  //       setChildren(new Map(childrenRef.current));
  //     }

  //     console.debug(
  //       `[xstate-tree] ${service.id} handling event`,
  //       (service.machine.meta as any)?.xstateTree?.ignoredEvents?.has(
  //         event.type
  //       )
  //         ? event.type
  //         : event
  //     );
  //   }

  //   service.onEvent(handler);

  //   return () => {
  //     service.off(handler);
  //   };
  // }, [service, setChildren]);

  return [current, children] as const;
}
