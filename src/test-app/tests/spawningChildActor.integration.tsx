import { render, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { delay } from "../../utils";
import { App } from "../AppMachine";

describe("creating a new child actor", () => {
  it("adds the new child actor into the existing multi-slot view when it is spawned", async () => {
    await cleanup();
    const { getByTestId, getAllByTestId } = render(<App />);

    await delay(5);
    await act(() => userEvent.type(getByTestId("todo-input"), "test{enter}"));

    await delay(300);
    expect(getAllByTestId("todo")).toHaveLength(3);
  });
});
