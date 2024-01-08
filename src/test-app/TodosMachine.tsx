import cx from "classnames";
import React from "react";
import { setup, assign, ActorRefFrom, assertEvent, fromPromise } from "xstate";

import { broadcast, multiSlot, createXStateTreeMachine } from "../";

import { TodoMachine } from "./TodoMachine";

type Context = {
  todos: ActorRefFrom<typeof TodoMachine>[];
  newTodo: string;
};
type Events =
  | { type: "TODO_INPUT_CHANGED"; val: string }
  | { type: "CREATE_TODO" }
  | { type: "REMOVE_TODO"; id: string }
  | { type: "CLEAR_COMPLETED" }
  | { type: "ALL_SELECTED" }
  | { type: "ACTIVE_SELECTED" }
  | { type: "COMPLETED_SELECTED" };
const TodosSlot = multiSlot("Todos");
const slots = [TodosSlot];
const lastId = 1;
const TodosMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  actions: {
    inputChanged: assign({
      newTodo: ({ event: e }) => {
        assertEvent(e, "TODO_INPUT_CHANGED");

        return e.val;
      },
    }),
  },
  actors: {
    fetchTodos: fromPromise(
      () =>
        new Promise<{ todo: string; id: string; completed: boolean }[]>(
          (res) => {
            res([
              { todo: "foo", id: "100", completed: false },
              { todo: "bar", id: "200", completed: true },
            ]);
          }
        )
    ),
    TodoMachine,
  },
}).createMachine({
  id: "todos",
  context: {
    todos: [],
    newTodo: "",
  },
  initial: "loadingTodos",
  on: {
    TODO_INPUT_CHANGED: {
      actions: "inputChanged",
    },
    CREATE_TODO: {
      actions: assign({
        newTodo: () => "",
        todos: ({ context: ctx, spawn }) => {
          const id = String(lastId + 1);

          return [
            ...ctx.todos,
            spawn("TodoMachine", {
              id: TodosSlot.getId(id),
              input: { todo: ctx.newTodo, id },
            }),
          ];
        },
      }),
      guard: ({ context: ctx }) => ctx.newTodo.trim().length > 0,
      target: ".chooseCorrectState",
    },
  },
  states: {
    loadingTodos: {
      invoke: {
        src: "fetchTodos",
        onDone: {
          actions: assign({
            todos: ({ context: ctx, event: e, spawn }) => {
              const foo = [
                ...ctx.todos,
                ...e.output.map((todo) =>
                  spawn("TodoMachine", {
                    id: TodosSlot.getId(String(todo.id)),
                    input: todo,
                  })
                ),
              ];

              return foo;
            },
          }),
          target: "chooseCorrectState",
        },
      },
    },
    chooseCorrectState: {
      always: [
        {
          target: "haveTodos.hist",
          guard: ({ context: ctx }) => ctx.todos.length > 0,
        },
        { target: "noTodos" },
      ],
    },
    haveTodos: {
      on: {
        REMOVE_TODO: {
          actions: assign({
            todos: ({ context: ctx, event: e }) => {
              return ctx.todos.filter(
                (todoActor) => todoActor.getSnapshot().context.id !== e.id
              );
            },
          }),
          target: "chooseCorrectState",
        },
        CLEAR_COMPLETED: "chooseCorrectState",
        ALL_SELECTED: ".all",
        ACTIVE_SELECTED: ".active",
        COMPLETED_SELECTED: ".completed",
      },
      initial: "all",
      states: {
        hist: {
          type: "history",
        },
        all: {
          entry: () => broadcast({ type: "VIEW_ALL_TODOS" }),
        },
        active: {
          entry: () => broadcast({ type: "VIEW_ACTIVE_TODOS" }),
        },
        completed: {
          entry: () => broadcast({ type: "VIEW_COMPLETED_TODOS" }),
        },
      },
    },
    noTodos: {},
  },
});

const BuiltTodosMachine = createXStateTreeMachine(TodosMachine, {
  selectors({ ctx, inState }) {
    return {
      todoInput: ctx.newTodo,
      allCompleted: ctx.todos.every(
        (todoActor) => todoActor.getSnapshot().context.completed
      ),
      uncompletedCount: ctx.todos.filter(
        (todoActor) => !todoActor.getSnapshot().context.completed
      ).length,
      loading: inState("loadingTodos"),
      haveTodos: inState({ haveTodos: undefined }),
      onActive: inState({ haveTodos: "active" }),
      onCompleted: inState({ haveTodos: "completed" }),
      onAll: inState({ haveTodos: "all" }),
    };
  },
  actions({ send, selectors }) {
    return {
      todoInputChanged(newVal: string) {
        send({ type: "TODO_INPUT_CHANGED", val: newVal });
      },
      createTodo() {
        send({ type: "CREATE_TODO" });
      },
      updateAllTodos() {
        broadcast({
          type: "UPDATE_ALL_TODOS",
          completed: !selectors.allCompleted,
        });
      },
      clearCompleted() {
        broadcast({ type: "CLEAR_COMPLETED" });
      },
      viewAllTodos() {
        send({ type: "ALL_SELECTED" });
      },
      viewActiveTodos() {
        send({ type: "ACTIVE_SELECTED" });
      },
      viewCompletedTodos() {
        send({ type: "COMPLETED_SELECTED" });
      },
    };
  },
  View({ slots, actions, selectors }) {
    if (selectors.loading) {
      return <p>Loading</p>;
    }

    return (
      <>
        <header className="header">
          <h1>todos</h1>
          <input
            className="new-todo"
            placeholder="What needs to be done?"
            autoFocus
            onChange={(e) => actions.todoInputChanged(e.currentTarget.value)}
            value={selectors.todoInput}
            onKeyPress={(e) => e.key === "Enter" && actions.createTodo()}
            data-testid="todo-input"
          />
        </header>
        {selectors.haveTodos && (
          <>
            <section className="main">
              <input
                id="toggle-all"
                className="toggle-all"
                type="checkbox"
                onClick={actions.updateAllTodos}
                data-testid="update-all"
              />
              <label htmlFor="toggle-all">Mark all as complete</label>
              <ul className="todo-list">
                <slots.TodosMulti />
              </ul>
            </section>
            <footer className="footer">
              <span className="todo-count">
                <strong data-testid="uncompleted-count">
                  {selectors.uncompletedCount}
                </strong>{" "}
                item
                {selectors.uncompletedCount !== 1 && "s"} left
              </span>
              <ul className="filters">
                <li>
                  <a
                    className={cx({ selected: selectors.onAll })}
                    href="#/"
                    onClick={actions.viewAllTodos}
                    data-testid="view-all"
                  >
                    All
                  </a>
                </li>
                <li>
                  <a
                    className={cx({ selected: selectors.onActive })}
                    href="#/active"
                    onClick={actions.viewActiveTodos}
                    data-testid="view-active"
                  >
                    Active
                  </a>
                </li>
                <li>
                  <a
                    className={cx({ selected: selectors.onCompleted })}
                    href="#/completed"
                    onClick={actions.viewCompletedTodos}
                  >
                    Completed
                  </a>
                </li>
              </ul>
              <button
                className="clear-completed"
                onClick={actions.clearCompleted}
              >
                Clear completed
              </button>
            </footer>
          </>
        )}
      </>
    );
  },
  slots,
});

export { BuiltTodosMachine as TodosMachine };
