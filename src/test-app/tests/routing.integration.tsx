import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { broadcast } from "../../";
import { delay } from "../../utils";
import { App } from "../AppMachine";

describe("Routing", () => {
  describe("spawning child machines after entering a route", () => {
    it("sends the latest matched routing event to the newly spawned machine", async () => {
      const { getByTestId } = render(<App />);

      await delay(50);
      await act(() => userEvent.click(getByTestId("swap-to-other-machine")));

      await delay(50);
      broadcast({ type: "GO_TO_DO_THE_THING_STATE" });

      await delay(10);
      expect(getByTestId("can-do-the-thing")).toHaveTextContent("true");
    });
  });
});
