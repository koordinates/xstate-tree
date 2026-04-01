import { render, act, cleanup, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { App } from "../AppMachine";

describe("updating child actors via broadcast", () => {
  it("re-renders the views for the child actors when they change", async () => {
    await cleanup();
    render(<App />);

    const updateAll = await screen.findByTestId("update-all");
    await act(() => userEvent.click(updateAll));

    await waitFor(() => {
      const todoInputs = screen.getAllByTestId("toggle-todo");
      for (const input of todoInputs) {
        expect(input).toBeChecked();
      }
    });
  });
});
