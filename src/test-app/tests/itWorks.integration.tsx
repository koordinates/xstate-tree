import { render } from "@testing-library/react";
import React from "react";

import { delay } from "../../utils";
import { App } from "../AppMachine";

describe("Test app", () => {
  it("renders the initial app", async () => {
    const { container } = render(<App />);

    await delay(100);
    expect(container).toMatchSnapshot();
  });
});
