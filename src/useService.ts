import { useState, useRef, useEffect } from "react";
import { EventObject, Interpreter, InterpreterFrom, AnyState } from "xstate";

import { AnyXstateTreeMachine, XstateTreeMachineStateSchemaV1 } from "./types";
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
  TInterpreter extends InterpreterFrom<AnyXstateTreeMachine>
>(service: TInterpreter) {
  const [current, setCurrent] = useState(service.state);
  const [children, setChildren] = useState(service.children);
  const childrenRef = useRef(new Map());

  useEffect(() => {
    childrenRef.current = children;
  }, [children]);

  useEffect(
    function () {
      // Set to current service state as there is a possibility
      // of a transition occurring between the initial useState()
      // initialization and useEffect() commit.
      setCurrent(service.state);
      setChildren(service.children);
      const listener = function (state: AnyState) {
        if (state.changed) {
          setCurrent(state);

          if (!isEqual(childrenRef.current, service.children)) {
            setChildren(new Map(service.children));
          }
        }
      };
      const sub = service.subscribe(listener);
      return function () {
        sub.unsubscribe();
      };
    },
    [service, setChildren]
  );
  useEffect(() => {
    function handler(event: EventObject) {
      if (event.type.includes("done")) {
        const idOfFinishedChild = event.type.split(".")[2];
        childrenRef.current.delete(idOfFinishedChild);
        setChildren(new Map(childrenRef.current));
      }

      console.debug(
        `[xstate-tree] ${service.id} handling event`,
        (service.machine.meta as any)?.xstateTree?.ignoredEvents?.has(
          event.type
        )
          ? event.type
          : event
      );
    }

    let prevState: undefined | AnyState = undefined;
    function transitionHandler(state: AnyState) {
      const ignoreContext: string[] | undefined = (service.machine.meta as any)
        ?.xstateTree?.ignoreContext;
      const context = ignoreContext ? "[context omitted]" : state.context;
      if (prevState) {
        console.debug(
          `[xstate-tree] ${service.id} transitioning from`,
          prevState.value,
          "to",
          state.value,
          context
        );
      } else {
        console.debug(
          `[xstate-tree] ${service.id} transitioning to ${state.value}`,
          context
        );
      }

      prevState = state;
    }

    service.onEvent(handler);
    service.onTransition(transitionHandler);

    return () => {
      service.off(handler);
      service.off(transitionHandler);
    };
  }, [service, setChildren]);

  return [
    current,
    children as unknown as Map<
      string | number,
      Interpreter<any, XstateTreeMachineStateSchemaV1<any, any, any>, any, any>
    >,
  ] as const;
}
