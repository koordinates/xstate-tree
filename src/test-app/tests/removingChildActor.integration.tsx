import { render, act, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { App } from "../AppMachine";

describe("removing an existing child actor", () => {
  it("it stops rendering the actor when it is stopped", async () => {
    render(<App />);

    const removeTodos = await screen.findAllByTestId("remove-todo");
    await act(() => userEvent.click(removeTodos[0]));

    await waitFor(() => {
      expect(screen.getAllByTestId("todo")).toHaveLength(1);
    });
  });
});
