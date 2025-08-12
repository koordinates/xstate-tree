// ignore file coverage
import cx from "classnames";
import React from "react";
import { setup, assign, sendParent } from "xstate";

import { PickEvent, createXStateTreeMachine } from "..";

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

const TodoMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
    input: {} as { todo: string; id: string; completed?: boolean },
  },
}).createMachine({
  context: ({ input }) => ({
    ...input,
    completed: input.completed ?? false,
    edittedTodo: "",
  }),
  initial: "idle",
  on: {
    UPDATE_ALL_TODOS: {
      actions: assign({ completed: ({ event: e }) => e.completed }),
    },
    CLEAR_COMPLETED: {
      guard: ({ context: ctx }) => ctx.completed,
      target: ".removed",
    },
  },
  states: {
    idle: {
      entry: assign({
        edittedTodo: ({ context: ctx }) => {
          return ctx.todo;
        },
      }),
      on: {
        TOGGLE_CLICKED: {
          actions: assign({ completed: ({ context: ctx }) => !ctx.completed }),
        },
        REMOVE: "removed",
        START_EDITING: "editing",
        VIEW_COMPLETED_TODOS: {
          target: "hidden",
          guard: ({ context: ctx }) => !ctx.completed,
        },
        VIEW_ACTIVE_TODOS: {
          target: "hidden",
          guard: ({ context: ctx }) => ctx.completed,
        },
      },
    },
    editing: {
      on: {
        EDITTING_CANCELLED: "idle",
        EDITTED_TODO_UPDATED: {
          actions: assign({
            edittedTodo: ({ event: e }) => e.updatedText,
          }),
        },
        EDITTING_FINISHED: [
          {
            target: "idle",
            guard: ({ context: ctx }) => ctx.edittedTodo.trim().length > 0,
            actions: assign({
              todo: ({ context: ctx }) => ctx.edittedTodo.trim(),
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
          guard: ({ context: ctx }) => ctx.completed,
        },
        VIEW_ACTIVE_TODOS: {
          target: "idle",
          guard: ({ context: ctx }) => !ctx.completed,
        },
      },
    },
    removed: {
      entry: sendParent(({ context: ctx }) => ({
        type: "REMOVE_TODO",
        id: ctx.id,
      })),
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
});

export { BoundTodoMachine as TodoMachine };
