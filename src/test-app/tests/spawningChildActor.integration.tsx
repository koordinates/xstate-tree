import { render, act, cleanup, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { App } from "../AppMachine";

describe("creating a new child actor", () => {
  it("adds the new child actor into the existing multi-slot view when it is spawned", async () => {
    await cleanup();
    render(<App />);

    const todoInput = await screen.findByTestId("todo-input");
    await act(() => userEvent.type(todoInput, "test{enter}"));

    await waitFor(() => {
      expect(screen.getAllByTestId("todo")).toHaveLength(3);
    });
  });
});
