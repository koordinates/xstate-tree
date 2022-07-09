import { render } from "@testing-library/react";
import { createMemoryHistory } from "history";
import React from "react";

import { buildRootComponent, broadcast } from "../../";
import { delay } from "../../utils";
import { OtherMachine } from "../OtherMachine";
import { settingsRoute } from "../routes";

const history = createMemoryHistory<any>();
const App = buildRootComponent(OtherMachine, {
  history,
  basePath: "",
  routes: [settingsRoute],
  getPathName: () => "/settings",
  getQueryString: () => "",
});

describe("Selectors & canHandleEvent", () => {
  it("Re-runs the selectors when canHandleEvent needs to be re-run", async () => {
    const { getByTestId, rerender } = render(<App />);

    // Eh? Why the fuck don't you just re-render when the useMachine hook updates...
    await delay(10);
    rerender(<App />);

    const canDoTheThing = getByTestId("can-do-the-thing");
    expect(canDoTheThing.textContent).toEqual("false");

    broadcast({ type: "GO_TO_DO_THE_THING_STATE" });

    await delay(10);

    const canDoTheThingUpdated = getByTestId("can-do-the-thing");
    expect(canDoTheThingUpdated.textContent).toEqual("true");
  });
});
