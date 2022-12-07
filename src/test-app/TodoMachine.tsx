// ignore file coverage
import cx from "classnames";
import React from "react";
import { createMachine, assign, sendParent } from "xstate";

import { Slot, PickEvent, createXStateTreeMachine } from "..";

import { UnmountingTest } from "./unmountingTestFixture";

declare global {
  interface XstateTreeEvents {
    UPDATE_ALL_TODOS: { completed: boolean };
    VIEW_COMPLETED_TODOS: string;
    VIEW_ACTIVE_TODOS: string;
    VIEW_ALL_TODOS: string;
    CLEAR_COMPLETED: string;
  }
}

type Context = {
  todo: string;
  completed: boolean;
  edittedTodo: string;
  id: string;
};
type Events =
  | { type: "TOGGLE_CLICKED" }
  | { type: "REMOVE" }
  | { type: "START_EDITING" }
  | { type: "EDITTING_FINISHED" }
  | { type: "EDITTING_CANCELLED" }
  | { type: "EDITTED_TODO_UPDATED"; updatedText: string }
  | { type: "UPDATE_ALL_TODOS"; completed: boolean }
  | { type: "CLEAR_COMPLETED" }
  | PickEvent<
      | "VIEW_ACTIVE_TODOS"
      | "VIEW_COMPLETED_TODOS"
      | "CLEAR_COMPLETED"
      | "VIEW_ALL_TODOS"
      | "UPDATE_ALL_TODOS"
    >;
type State =
  | { value: "idle"; context: Context }
  | { value: "editing"; context: Context }
  | { value: "hidden"; context: Context }
  | { value: "removed"; context: Context };

const slots: Slot[] = [];
const TodoMachine = createMachine<Context, Events, State>({
  context: {
    todo: "",
    completed: false,
    edittedTodo: "",
    id: "",
  },
  initial: "idle",
  on: {
    UPDATE_ALL_TODOS: {
      actions: assign({ completed: (_ctx, e) => e.completed }),
    },
    CLEAR_COMPLETED: {
      cond: (ctx) => ctx.completed,
      target: "removed",
    },
  },
  states: {
    idle: {
      entry: assign({
        edittedTodo: (ctx) => {
          return ctx.todo;
        },
      }),
      on: {
        TOGGLE_CLICKED: {
          actions: assign({ completed: (ctx) => !ctx.completed }),
        },
        REMOVE: "removed",
        START_EDITING: "editing",
        VIEW_COMPLETED_TODOS: {
          target: "hidden",
          cond: (ctx) => !ctx.completed,
        },
        VIEW_ACTIVE_TODOS: {
          target: "hidden",
          cond: (ctx) => ctx.completed,
        },
      },
    },
    editing: {
      on: {
        EDITTING_CANCELLED: "idle",
        EDITTED_TODO_UPDATED: {
          actions: assign({
            edittedTodo: (_ctx, e) => e.updatedText,
          }),
        },
        EDITTING_FINISHED: [
          {
            target: "idle",
            cond: (ctx) => ctx.edittedTodo.trim().length > 0,
            actions: assign({
              todo: (ctx) => ctx.edittedTodo.trim(),
            }),
          },
          {
            target: "removed",
          },
        ],
      },
    },
    hidden: {
      on: {
        VIEW_ALL_TODOS: "idle",
        VIEW_COMPLETED_TODOS: {
          target: "idle",
          cond: (ctx) => ctx.completed,
        },
        VIEW_ACTIVE_TODOS: {
          target: "idle",
          cond: (ctx) => !ctx.completed,
        },
      },
    },
    removed: {
      entry: sendParent((ctx) => ({ type: "REMOVE_TODO", id: ctx.id })),
      type: "final",
    },
  },
});

const BoundTodoMachine = createXStateTreeMachine(TodoMachine, {
  selectors({ ctx, inState }) {
    return {
      todo: ctx.todo,
      edittedTodoText: ctx.edittedTodo,
      completed: ctx.completed,
      editing: inState("editing"),
      hidden: inState("hidden"),
    };
  },
  actions({ send }) {
    return {
      toggle() {
        send({ type: "TOGGLE_CLICKED" });
      },
      remove() {
        send({ type: "REMOVE" });
      },
      startEditing() {
        send({ type: "START_EDITING" });
      },
      finishEditing() {
        send({ type: "EDITTING_FINISHED" });
      },
      cancelEditing() {
        send({ type: "EDITTING_CANCELLED" });
      },
      updateEdittedTodoText(text: string) {
        send({ type: "EDITTED_TODO_UPDATED", updatedText: text });
      },
    };
  },
  View({ selectors, actions }) {
    if (selectors.hidden) {
      return null;
    }

    return (
      <li
        className={cx({
          completed: selectors.completed,
          editing: selectors.editing,
        })}
        data-testid="todo"
      >
        <div className="view">
          <UnmountingTest />
          <input
            className="toggle"
            type="checkbox"
            onClick={actions.toggle}
            checked={selectors.completed}
            data-testid="toggle-todo"
          />
          <label onDoubleClick={actions.startEditing}>{selectors.todo}</label>
          <button
            className="destroy"
            onClick={actions.remove}
            data-testid="remove-todo"
          />
        </div>
        <input
          className="edit"
          value={selectors.edittedTodoText}
          onChange={(e) => actions.updateEdittedTodoText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              actions.finishEditing();
            } else if (e.key === "Escape") {
              actions.cancelEditing();
            }
          }}
          autoFocus={selectors.editing}
        />
      </li>
    );
  },
  slots,
});

export { BoundTodoMachine as TodoMachine };
