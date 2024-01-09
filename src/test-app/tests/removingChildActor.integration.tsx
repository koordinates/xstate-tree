import { render, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { delay } from "../../utils";
import { App } from "../AppMachine";

describe("removing an existing child actor", () => {
  it("it stops rendering the actor when it is stopped", async () => {
    const { getAllByTestId } = render(<App />);

    await delay(50);
    await act(() => userEvent.click(getAllByTestId("remove-todo")[0]));

    await delay(300);
    expect(getAllByTestId("todo")).toHaveLength(1);
  });
});
