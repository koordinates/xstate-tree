/* eslint-disable import/first */
const unmountingMock = jest.fn();
jest.mock("../unmountingTestFixture/unmountCb", () => {
  return {
    calledOnUnmount: unmountingMock,
  };
});
import { render, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { delay } from "../../utils";
import { App } from "../AppMachine";

describe("Rendering behaviour", () => {
  it("Child components are not unmounted when re-rendering root view", async () => {
    await cleanup();
    const { getByTestId, getAllByTestId } = render(<App />);

    await delay(5);
    await act(() => userEvent.type(getByTestId("todo-input"), "test{enter}"));

    await delay(300);
    expect(getAllByTestId("todo")).toHaveLength(3);
    expect(unmountingMock).not.toHaveBeenCalled();
  });
});
