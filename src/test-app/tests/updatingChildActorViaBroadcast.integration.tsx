import { render, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { delay } from "../../utils";
import { App } from "../AppMachine";

describe("updating child actors via broadcast", () => {
  it("re-renders the views for the child actors when they change", async () => {
    await cleanup();
    const { getByTestId, getAllByTestId } = render(<App />);

    await delay(5);
    await act(() => userEvent.click(getByTestId("update-all")));

    await delay(300);
    const todoInputs = getAllByTestId("toggle-todo");
    for (const input of todoInputs) {
      expect(input).toBeChecked();
    }
  });
});
