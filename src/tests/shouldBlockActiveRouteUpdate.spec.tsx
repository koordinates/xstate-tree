import { act, render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";
import { createMachine } from "xstate";
import { z } from "zod";

import {
  buildActions,
  buildCreateRoute,
  buildRootComponent,
  buildSelectors,
  buildView,
  buildXStateTreeMachine,
  onBroadcast,
  useActiveRouteEvents,
  XstateTreeHistory,
} from "../";
import { RoutingEvent } from "../routing";
import { delay } from "../utils";

function makeFixture() {
  const hist: XstateTreeHistory = createMemoryHistory();
  const createRoute = buildCreateRoute(() => hist, "/");

  const homeRoute = createRoute.simpleRoute()({
    url: "/home/",
    event: "GO_HOME",
  });
  const pageRoute = createRoute.simpleRoute()({
    url: "/page/:id/",
    event: "GO_PAGE",
    paramsSchema: z.object({ id: z.string() }),
    meta: {} as { openStandalone?: boolean },
  });
  const otherRoute = createRoute.simpleRoute()({
    url: "/other/",
    event: "GO_OTHER",
  });

  let lastSeenEvents: RoutingEvent<any>[] | undefined = undefined;
  const Probe = () => {
    lastSeenEvents = useActiveRouteEvents();
    return <p>probe</p>;
  };

  const machine = createMachine<any, any>({
    context: {},
    initial: "idle",
    states: { idle: {} },
  });
  const selectors = buildSelectors(machine, (ctx) => ctx);
  const actions = buildActions(machine, selectors, () => ({}));
  const view = buildView(machine, selectors, actions, [], () => <Probe />);

  return {
    hist,
    homeRoute,
    pageRoute,
    otherRoute,
    machine,
    selectors,
    actions,
    view,
    getLastSeenEvents: () => lastSeenEvents,
  };
}

describe("shouldBlockActiveRouteUpdate", () => {
  it("skips the active route update when the predicate returns true", async () => {
    const f = makeFixture();
    const Root = buildRootComponent(
      buildXStateTreeMachine(f.machine, {
        actions: f.actions,
        selectors: f.selectors,
        view: f.view,
        slots: [],
      }),
      {
        basePath: "/",
        history: f.hist,
        routes: [f.homeRoute, f.pageRoute, f.otherRoute],
        shouldBlockActiveRouteUpdate: (event) =>
          (event.meta as { openStandalone?: boolean } | undefined)
            ?.openStandalone === true,
      }
    );

    f.hist.push("/home/");
    render(<Root />);
    await delay(10);

    const initialTypes = f.getLastSeenEvents()?.map((e) => e.type);
    expect(initialTypes).toEqual(["GO_HOME"]);

    await act(async () => {
      f.pageRoute.navigate({
        params: { id: "1" },
        meta: { openStandalone: true },
      });
      await delay(10);
    });

    expect(f.getLastSeenEvents()?.map((e) => e.type)).toEqual(["GO_HOME"]);
  });

  it("still broadcasts the event for a blocked navigation", async () => {
    const f = makeFixture();
    const Root = buildRootComponent(
      buildXStateTreeMachine(f.machine, {
        actions: f.actions,
        selectors: f.selectors,
        view: f.view,
        slots: [],
      }),
      {
        basePath: "/",
        history: f.hist,
        routes: [f.homeRoute, f.pageRoute],
        shouldBlockActiveRouteUpdate: () => true,
      }
    );

    f.hist.push("/home/");
    render(<Root />);
    await delay(10);

    const seen: string[] = [];
    const unsub = onBroadcast((e) => seen.push(e.type));

    await act(async () => {
      f.pageRoute.navigate({ params: { id: "42" } });
      await delay(10);
    });

    unsub();
    expect(seen).toContain("GO_PAGE");
  });

  it("behaves as normal when the predicate returns false", async () => {
    const f = makeFixture();
    const Root = buildRootComponent(
      buildXStateTreeMachine(f.machine, {
        actions: f.actions,
        selectors: f.selectors,
        view: f.view,
        slots: [],
      }),
      {
        basePath: "/",
        history: f.hist,
        routes: [f.homeRoute, f.pageRoute],
        shouldBlockActiveRouteUpdate: () => false,
      }
    );

    f.hist.push("/home/");
    render(<Root />);
    await delay(10);

    await act(async () => {
      f.pageRoute.navigate({ params: { id: "1" } });
      await delay(10);
    });

    expect(f.getLastSeenEvents()?.map((e) => e.type)).toEqual(["GO_PAGE"]);
  });

  it("behaves as normal when the option is omitted", async () => {
    const f = makeFixture();
    const Root = buildRootComponent(
      buildXStateTreeMachine(f.machine, {
        actions: f.actions,
        selectors: f.selectors,
        view: f.view,
        slots: [],
      }),
      {
        basePath: "/",
        history: f.hist,
        routes: [f.homeRoute, f.pageRoute],
      }
    );

    f.hist.push("/home/");
    render(<Root />);
    await delay(10);

    await act(async () => {
      f.pageRoute.navigate({ params: { id: "1" } });
      await delay(10);
    });

    expect(f.getLastSeenEvents()?.map((e) => e.type)).toEqual(["GO_PAGE"]);
  });

  it("treats the block as per-navigation, so a later unblocked navigation updates the active events", async () => {
    const f = makeFixture();
    const Root = buildRootComponent(
      buildXStateTreeMachine(f.machine, {
        actions: f.actions,
        selectors: f.selectors,
        view: f.view,
        slots: [],
      }),
      {
        basePath: "/",
        history: f.hist,
        routes: [f.homeRoute, f.pageRoute, f.otherRoute],
        shouldBlockActiveRouteUpdate: (event) =>
          (event.meta as { openStandalone?: boolean } | undefined)
            ?.openStandalone === true,
      }
    );

    f.hist.push("/home/");
    render(<Root />);
    await delay(10);

    await act(async () => {
      f.pageRoute.navigate({
        params: { id: "1" },
        meta: { openStandalone: true },
      });
      await delay(10);
    });
    expect(f.getLastSeenEvents()?.map((e) => e.type)).toEqual(["GO_HOME"]);

    await act(async () => {
      f.otherRoute.navigate({});
      await delay(10);
    });

    expect(f.getLastSeenEvents()?.map((e) => e.type)).toEqual(["GO_OTHER"]);
  });

  it("does not fire redirects for a blocked initial-mount navigation, but still broadcasts the event", async () => {
    const hist: XstateTreeHistory = createMemoryHistory();
    const createRoute = buildCreateRoute(() => hist, "/");

    const redirectSpy = jest.fn();
    const initialRoute = createRoute.simpleRoute()({
      url: "/initial/",
      event: "GO_INITIAL",
      redirect: async () => {
        redirectSpy();
        return undefined;
      },
    });

    const machine = createMachine<any, any>({
      context: {},
      initial: "idle",
      states: { idle: {} },
    });
    const selectors = buildSelectors(machine, (ctx) => ctx);
    const actions = buildActions(machine, selectors, () => ({}));
    const view = buildView(machine, selectors, actions, [], () => <p>x</p>);

    hist.push("/initial/");

    const seen: string[] = [];
    const unsub = onBroadcast((e) => seen.push(e.type));

    const Root = buildRootComponent(
      buildXStateTreeMachine(machine, { actions, selectors, view, slots: [] }),
      {
        basePath: "/",
        history: hist,
        routes: [initialRoute],
        shouldBlockActiveRouteUpdate: () => true,
      }
    );

    render(<Root />);
    await delay(50);

    unsub();
    expect(seen).toContain("GO_INITIAL");
    expect(redirectSpy).not.toHaveBeenCalled();
  });
});
