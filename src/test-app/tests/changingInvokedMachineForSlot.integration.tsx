import { render, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import "@testing-library/jest-dom";

import { delay } from "../../utils";
import { App } from "../AppMachine";

describe("changing the machine invoked into a slot", () => {
  it("correctly updates the view to point to the new machine", async () => {
    const { getByTestId, queryByTestId } = render(<App />);

    await delay(50);
    await act(() => userEvent.click(getByTestId("swap-to-other-machine")));

    await delay(50);
    expect(queryByTestId("other-text")).toBeInTheDocument();
    expect(getByTestId("header")).toHaveTextContent("On settings");
  });
});
