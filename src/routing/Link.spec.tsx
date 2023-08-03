import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory } from "history";
import React from "react";
import { z } from "zod";

import { delay } from "../utils";

import { Link } from "./Link";
import { buildCreateRoute } from "./createRoute";

const hist = createMemoryHistory<{ meta?: unknown }>();
const createRoute = buildCreateRoute(() => hist, "/");

const route = createRoute.simpleRoute()({
  event: "event",
  url: "/url/:param",
  paramsSchema: z.object({ param: z.string() }),
});

describe("Link", () => {
  describe("preloading", () => {
    it("calls the route preload on mouseDown if preloadOnInteraction is true", async () => {
      route.preload = jest.fn();

      const { getByText, rerender } = render(
        <Link to={route} params={{ param: "test" }}>
          Link
        </Link>
      );

      await userEvent.click(getByText("Link"));
      expect(route.preload).not.toHaveBeenCalled();

      rerender(
        <Link to={route} params={{ param: "test" }} preloadOnInteraction>
          Link
        </Link>
      );

      await userEvent.click(getByText("Link"));
      expect(route.preload).toHaveBeenCalledWith({ params: { param: "test" } });
    });

    it("calls the route preload on hover if preloadOnHoverMs is set", async () => {
      route.preload = jest.fn();

      const { getByText, rerender } = render(
        <Link to={route} params={{ param: "test" }}>
          Link
        </Link>
      );

      await userEvent.hover(getByText("Link"));
      expect(route.preload).not.toHaveBeenCalled();

      rerender(
        <Link to={route} params={{ param: "test" }} preloadOnHoverMs={0}>
          Link
        </Link>
      );

      await userEvent.hover(getByText("Link"));
      await delay(0);
      expect(route.preload).toHaveBeenCalledWith({ params: { param: "test" } });
    });

    it("does not call the preload if the element isn't hovered for long enough", async () => {
      route.preload = jest.fn();

      const { getByText } = render(
        <Link to={route} params={{ param: "test" }} preloadOnHoverMs={15}>
          Link
        </Link>
      );

      await userEvent.hover(getByText("Link"));
      await delay(2);
      await userEvent.unhover(getByText("Link"));

      await delay(15);
      expect(route.preload).not.toHaveBeenCalled();
    });

    it("calls user supplied onMouse Down/Enter/Leave when preloading is not active", async () => {
      const onMouseDown = jest.fn();
      const onMouseEnter = jest.fn();
      const onMouseLeave = jest.fn();

      const { getByText } = render(
        <Link
          to={route}
          params={{ param: "test" }}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          Link
        </Link>
      );

      await userEvent.hover(getByText("Link"));
      await userEvent.click(getByText("Link"));
      await userEvent.unhover(getByText("Link"));

      expect(onMouseDown).toHaveBeenCalledTimes(1);
      expect(onMouseEnter).toHaveBeenCalledTimes(2);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
    });

    it("calls user supplied onMouse Down/Enter/Leave when preloading is active", async () => {
      const onMouseDown = jest.fn();
      const onMouseEnter = jest.fn();
      const onMouseLeave = jest.fn();
      route.preload = jest.fn();

      const { getByText } = render(
        <Link
          to={route}
          params={{ param: "test" }}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          preloadOnHoverMs={0}
          preloadOnInteraction
        >
          Link
        </Link>
      );

      await userEvent.hover(getByText("Link"));
      await userEvent.click(getByText("Link"));
      await userEvent.unhover(getByText("Link"));

      expect(onMouseDown).toHaveBeenCalledTimes(1);
      expect(onMouseEnter).toHaveBeenCalledTimes(2);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      expect(route.preload).toHaveBeenCalledTimes(3);
    });
  });
});
