/* eslint-disable import/first */
const unmountingMock = jest.fn();
jest.mock("../unmountingTestFixture/unmountCb", () => {
  return {
    calledOnUnmount: unmountingMock,
  };
});
import { render, act, cleanup, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { App } from "../AppMachine";

describe("Rendering behaviour", () => {
  it("Child components are not unmounted when re-rendering root view", async () => {
    await cleanup();
    render(<App />);

    const todoInput = await screen.findByTestId("todo-input");
    await act(() => userEvent.type(todoInput, "test{enter}"));

    await waitFor(() => {
      expect(screen.getAllByTestId("todo")).toHaveLength(3);
    });
    expect(unmountingMock).not.toHaveBeenCalled();
  });
});
