import { render, waitFor } from "@testing-library/react";
import React from "react";

import { viewToMachine } from "./builders";
import { buildRootComponent } from "./xstateTree";

describe("xstate-tree builders", () => {
  describe("viewToMachine", () => {
    it("takes a React view and wraps it in an xstate-tree machine that renders that view", async () => {
      const ViewMachine = viewToMachine(() => <div>hello world</div>);
      const Root = buildRootComponent(ViewMachine);

      const { getByText } = render(<Root />);

      await waitFor(() => getByText("hello world"));
    });
  });
});
