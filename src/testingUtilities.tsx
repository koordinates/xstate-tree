// ignore file coverage
import { useMachine } from "@xstate/react";
import React, { JSXElementConstructor, useEffect } from "react";
import { TinyEmitter } from "tiny-emitter";
import {
  StateMachine,
  createMachine,
  AnyStateMachine,
  ContextFrom,
  EventFrom,
} from "xstate";

import { buildXStateTreeMachine } from "./builders";
import {
  XstateTreeMachineStateSchema,
  GlobalEvents,
  ViewProps,
  AnySelector,
  AnyActions,
} from "./types";
import { difference, PropsOf } from "./utils";
import { emitter, recursivelySend, XstateTreeView } from "./xstateTree";

/**
 * @public
 */
export function slotTestingDummyFactory(name: string) {
  return buildXStateTreeMachine(
    createMachine({
      id: name,
      initial: "idle",
      states: {
        idle: {},
      },
    }),
    {
      actions: () => ({}),
      selectors: () => ({}),
      slots: [],
      view: () => (
        <div>
          <p>{name}</p>
        </div>
      ),
    }
  );
}

/**
 * @public
 */
export const genericSlotsTestingDummy = new Proxy(
  {},
  {
    get(_target, prop) {
      return () => (
        <div>
          <p>
            <>{prop}-slot</>
          </p>
        </div>
      );
    },
  }
) as any;

type InferViewProps<T> = T extends ViewProps<
  infer TSelectors,
  infer TActions,
  never,
  infer TMatches
>
  ? {
      selectors: TSelectors;
      actions: TActions;
      inState: (state: Parameters<TMatches>[0]) => TMatches;
    }
  : never;

/**
 * @public
 */
export function buildViewProps<
  C extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>
>(
  _view: C,
  props: Pick<InferViewProps<PropsOf<C>>, "actions" | "selectors">
): InferViewProps<PropsOf<C>> {
  return {
    ...props,
    inState: (testState: any) => (state: any) =>
      state === testState || testState.startsWith(state),
  } as InferViewProps<PropsOf<C>>;
}

/**
 * @public
 *
 * Sets up a root component for use in an \@xstate/test model backed by \@testing-library/react for the component
 *
 * The logger argument should just be a simple function which forwards the arguments to console.log,
 * this is needed because Wallaby.js only displays console logs in tests that come from source code, not library code,
 * so any logs from inside this file don't show up in the test explorer
 *
 * The returned object has a `rootComponent` property and a function, `awaitTransition`, that returns a Promise
 * when called that is resolved the next time the underlying machine transitions. This can be used in the \@xstate/test
 * model to ensure after an event action is executed the test in the next state doesn't run until after the machine transitions
 *
 * It also delays for 5ms to ensure any React re-rendering happens in response to the state transition
 */
export function buildTestRootComponent<
  TMachine extends AnyStateMachine,
  TSelectors extends AnySelector,
  TActions extends AnyActions,
  TContext = ContextFrom<TMachine>
>(
  machine: StateMachine<
    TContext,
    XstateTreeMachineStateSchema<TMachine, TSelectors, TActions>,
    EventFrom<TMachine>
  >,
  logger: typeof console.log
) {
  if (!machine.meta) {
    throw new Error("Root machine has no meta");
  }
  if (!machine.meta.view) {
    throw new Error("Root machine has no associated view");
  }
  const onChangeEmitter = new TinyEmitter();

  function addTransitionListener(listener: () => void) {
    onChangeEmitter.once("transition", listener);
  }

  return {
    rootComponent: function XstateTreeRootComponent() {
      const [_, __, interpreter] = useMachine(machine, { devTools: true });

      useEffect(() => {
        function handler(event: GlobalEvents) {
          recursivelySend(interpreter, event);
        }
        function changeHandler(ctx: TContext, oldCtx: TContext | undefined) {
          logger(
            "onChange: ",
            JSON.stringify(difference(ctx, oldCtx), null, 2)
          );
          onChangeEmitter.emit("changed", ctx);
        }
        function onEventHandler(e: any) {
          logger("onEvent", e);
        }
        function onTransitionHandler(s: any) {
          logger("State: ", s.value);
          onChangeEmitter.emit("transition");
        }

        interpreter.onChange(changeHandler);
        interpreter.onEvent(onEventHandler);
        interpreter.onTransition(onTransitionHandler);

        emitter.on("event", handler);

        return () => {
          emitter.off("event", handler);
          interpreter.off(changeHandler);
          interpreter.off(onEventHandler);
          interpreter.off(onTransitionHandler);
        };
      }, [interpreter]);

      if (!interpreter.initialized) {
        return null;
      }

      return <XstateTreeView interpreter={interpreter} />;
    },
    addTransitionListener,
    awaitTransition() {
      return new Promise<void>((res) => {
        addTransitionListener(() => {
          setTimeout(res, 50);
        });
      });
    },
  };
}
