import cx from "classnames";
import React from "react";
import {
  createMachine,
  assign,
  spawn,
  DoneInvokeEvent,
  ActorRefFrom,
} from "xstate";

import {
  broadcast,
  buildSelectors,
  buildActions,
  buildView,
  multiSlot,
  buildXStateTreeMachine,
} from "../";
import { assert } from "../utils";

import { TodoMachine } from "./TodoMachine";

enum Actions {
  inputChanged = "inputChanged",
}
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
type State =
  | { value: "loadingTodos"; context: Context }
  | { value: "noTodos"; context: Context }
  | { value: "haveTodos"; context: Context }
  | { value: "haveTodos.all"; context: Context }
  | { value: "haveTodos.active"; context: Context }
  | { value: "haveTodos.completed"; context: Context };
const TodosSlot = multiSlot("Todos");
const slots = [TodosSlot];
let lastId = 1;
const TodosMachine = createMachine<Context, Events, State>(
  {
    id: "todos",
    context: {
      todos: [],
      newTodo: "",
    },
    initial: "loadingTodos",
    on: {
      TODO_INPUT_CHANGED: {
        actions: Actions.inputChanged,
      },
      CREATE_TODO: {
        actions: assign<Context, Events>({
          newTodo: () => "",
          todos: (ctx) => {
            const id = String(lastId + 1);

            return [
              ...ctx.todos,
              spawn(
                TodoMachine.withContext({
                  todo: ctx.newTodo.trim(),
                  completed: false,
                  id,
                  edittedTodo: "",
                }),
                TodosSlot.getId(id)
              ),
            ];
          },
        }) as any,
        cond: (ctx) => ctx.newTodo.trim().length > 0,
        target: "chooseCorrectState",
      },
    },
    states: {
      loadingTodos: {
        invoke: {
          src: () =>
            new Promise((res) => {
              res([
                { todo: "foo", id: "100", completed: false },
                { todo: "bar", id: "200", completed: true },
              ]);
            }),
          onDone: {
            actions: assign<Context, any>({
              todos: (
                ctx: Context,
                e: DoneInvokeEvent<
                  { todo: string; id: string; completed: boolean }[]
                >
              ) => {
                const foo = [
                  ...ctx.todos,
                  ...e.data.map((todo) =>
                    spawn(
                      TodoMachine.withContext({ ...todo, edittedTodo: "" }),
                      TodosSlot.getId(String(todo.id))
                    )
                  ),
                ];

                return foo;
              },
            }) as any,
            target: "chooseCorrectState",
          },
        },
      },
      chooseCorrectState: {
        always: [
          { target: "haveTodos.hist", cond: (ctx) => ctx.todos.length > 0 },
          { target: "noTodos" },
        ],
      },
      haveTodos: {
        on: {
          REMOVE_TODO: {
            actions: assign({
              todos: (ctx, e) => {
                return ctx.todos.filter(
                  (todoActor) => todoActor.state.context.id !== e.id
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
  },
  {
    actions: {
      [Actions.inputChanged]: assign<Context, Events>({
        newTodo: (_ctx, e) => {
          assert(e.type === "TODO_INPUT_CHANGED");

          return e.val;
        },
      }),
    },
  }
);

const TodosSelectors = buildSelectors(TodosMachine, (ctx) => {
  return {
    todoInput: ctx.newTodo,
    allCompleted: ctx.todos.every(
      (todoActor) => todoActor.state.context.completed
    ),
    uncompletedCount: ctx.todos.filter(
      (todoActor) => !todoActor.state.context.completed
    ).length,
  };
});

const TodosActions = buildActions(
  TodosMachine,
  TodosSelectors,
  (send, selectors) => {
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
  }
);

const TodosView = buildView(
  TodosMachine,
  TodosSelectors,
  TodosActions,
  slots,
  ({ slots, actions, selectors, inState }) => {
    if (inState("loadingTodos")) {
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
        {inState("haveTodos") && (
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
                <slots.Todos />
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
                    className={cx({ selected: inState("haveTodos.all") })}
                    href="#/"
                    onClick={actions.viewAllTodos}
                    data-testid="view-all"
                  >
                    All
                  </a>
                </li>
                <li>
                  <a
                    className={cx({ selected: inState("haveTodos.active") })}
                    href="#/active"
                    onClick={actions.viewActiveTodos}
                    data-testid="view-active"
                  >
                    Active
                  </a>
                </li>
                <li>
                  <a
                    className={cx({ selected: inState("haveTodos.completed") })}
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
  }
);

const BuiltTodosMachine = buildXStateTreeMachine(TodosMachine, {
  view: TodosView,
  selectors: TodosSelectors,
  actions: TodosActions,
  slots,
});

export { BuiltTodosMachine as TodosMachine };
