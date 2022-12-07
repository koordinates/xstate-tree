import {
  broadcast,
  multiSlot,
  Link,
  RoutingEvent,
  createXStateTreeMachine,
} from "@koordinates/xstate-tree";
import { assign } from "@xstate/immer";
import React from "react";
import { map } from "rxjs/operators";
import { createMachine, type ActorRefFrom, spawn } from "xstate";

import { TodoMachine } from "./Todo";
import { todos$, type Todo } from "./models";
import { activeTodos, allTodos, completedTodos } from "./routes";

type Context = {
  todos: Todo[];
  actors: Record<string, ActorRefFrom<typeof TodoMachine>>;
  filter: "all" | "active" | "completed";
};
type Events =
  | { type: "SYNC_TODOS"; todos: Todo[] }
  | RoutingEvent<typeof activeTodos>
  | RoutingEvent<typeof allTodos>
  | RoutingEvent<typeof completedTodos>;

const TodosSlot = multiSlot("Todos");
const machine =
  /** @xstate-layout N4IgpgJg5mDOIC5QBcD2FUFoCGAHXAdAMaoB2EArkWgE4DEiouqsAlsq2YyAB6ICMAFgBMBAJwTBANgkBWAOwAOWQGYpwgDQgAngMEEp-RYNn8FABmHmxMlQF87WtBhz46AZQCaAOQDCAfQAVAHkAEWD3bmY2Di4kXkRMeSkCEWTzRUUbYUV5c1ktXQRMflKCMyUxQXk1Y2FShyd0LDxcDwAJYIB1fwBBX0CASQA1AFEgsIiolnZOUm4+BBUagitzFWFZasVzczMpQsThFeVFFV35fjzLQUaQZxa3d06e3oAZN4nwyPjo2bjQIt+FJFKsxNYxLIbLJNoIxIpDsUVFDUsJBGcVGIrPxjrdHPdmq42s9uv5fMEALIABTeo0Co1CXymvxmsXm8UWJWsBB2ljUVThe2EBx0iWRYlR6JUmOxuIc+NI6Dg3AeROIZEo1FQNGmMTmC0SslBVRqIJE-HywsEgkRVwIlWqan40tM-DuqtaBEVgWa8BZeoBCQQV1EUhUFSyjrNNtFwZs4kjpysKkUwjU7sJnoAFthYD6MH6mKz9RzDeYCDCwxGTfzbfH4VUk+tU+n8R78Lr-uzAYkLeW0lIMll1Ll8ojMGiUhGzkIU2JWw4gA */
  createMachine(
    {
      context: { todos: [], actors: {}, filter: "all" },
      tsTypes: {} as import("./App.typegen").Typegen0,
      schema: { context: {} as Context, events: {} as Events },
      predictableActionArguments: true,
      invoke: {
        src: "syncTodos",
        id: "syncTodos",
      },
      id: "todo-app",
      initial: "conductor",
      on: {
        SYNC_TODOS: {
          actions: "syncTodos",
          target: ".conductor",
        },
        SHOW_ACTIVE_TODOS: {
          actions: "setFilter",
        },
        SHOW_ALL_TODOS: {
          actions: "setFilter",
        },
        SHOW_COMPLETED_TODOS: {
          actions: "setFilter",
        },
      },
      states: {
        conductor: {
          always: [
            {
              cond: "hasTodos",
              target: "hasTodos",
            },
            {
              target: "noTodos",
            },
          ],
        },
        noTodos: {},
        hasTodos: {},
      },
    },
    {
      actions: {
        syncTodos: assign((ctx, e) => {
          ctx.todos = e.todos;

          ctx.todos.forEach((todo) => {
            if (!ctx.actors[todo.id]) {
              ctx.actors[todo.id] = spawn(
                TodoMachine.withContext({ ...TodoMachine.context, todo }),
                TodosSlot.getId(todo.id)
              );
            }
          });
        }),
        setFilter: assign((ctx, e) => {
          ctx.filter =
            e.type === "SHOW_ACTIVE_TODOS"
              ? "active"
              : e.type === "SHOW_COMPLETED_TODOS"
              ? "completed"
              : "all";
        }),
      },
      guards: {
        hasTodos: (ctx) => ctx.todos.length > 0,
      },
      services: {
        syncTodos: () => {
          return todos$.pipe(
            map((todos): Events => ({ type: "SYNC_TODOS", todos }))
          );
        },
      },
    }
  );

export const TodoApp = createXStateTreeMachine(machine, {
  selectors({ ctx, inState }) {
    return {
      get count() {
        const completedCount = ctx.todos.filter((t) => t.completed).length;
        const activeCount = ctx.todos.length - completedCount;

        return ctx.filter === "completed" ? completedCount : activeCount;
      },
      get countText() {
        const count = this.count;
        const plural = count === 1 ? "" : "s";

        return `item${plural} ${
          ctx.filter === "completed" ? "completed" : "left"
        }`;
      },
      allCompleted: ctx.todos.every((t) => t.completed),
      haveCompleted: ctx.todos.some((t) => t.completed),
      allTodosClass: ctx.filter === "all" ? "selected" : undefined,
      activeTodosClass: ctx.filter === "active" ? "selected" : undefined,
      completedTodosClass: ctx.filter === "completed" ? "selected" : undefined,
      hasTodos: inState("hasTodos"),
    };
  },
  actions() {
    return {
      addTodo(title: string) {
        const trimmed = title.trim();

        if (trimmed.length > 0) {
          broadcast({ type: "TODO_CREATED", text: trimmed });
        }
      },
      completeAll(completed: boolean) {
        broadcast({ type: "TODO_ALL_COMPLETED", completed });
      },
      clearCompleted() {
        broadcast({ type: "TODO_COMPLETED_CLEARED" });
      },
    };
  },
  slots: [TodosSlot],
  View({ actions, selectors, slots }) {
    return (
      <>
        <section className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <input
              className="new-todo"
              placeholder="What needs to be done?"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  actions.addTodo(e.currentTarget.value);
                }
              }}
            />
          </header>

          {selectors.hasTodos && (
            <>
              <section className="main">
                <input
                  id="toggle-all"
                  className="toggle-all"
                  type="checkbox"
                  onChange={() => actions.completeAll(!selectors.allCompleted)}
                  checked={selectors.allCompleted}
                />
                <label htmlFor="toggle-all">Mark all as complete</label>

                <ul className="todo-list">
                  <slots.TodosMulti />
                </ul>
              </section>

              <footer className="footer">
                <span className="todo-count">
                  <strong>{selectors.count}</strong> {selectors.countText}
                </span>
                <ul className="filters">
                  <li>
                    <Link to={allTodos} className={selectors.allTodosClass}>
                      All
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={activeTodos}
                      className={selectors.activeTodosClass}
                    >
                      Active
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={completedTodos}
                      className={selectors.completedTodosClass}
                    >
                      Completed
                    </Link>
                  </li>
                </ul>

                {selectors.haveCompleted && (
                  <button
                    className="clear-completed"
                    onClick={actions.clearCompleted}
                  >
                    Clear completed
                  </button>
                )}
              </footer>
            </>
          )}
        </section>

        <footer className="info">
          <p>Double-click to edit a todo</p>
          <p>Created by Taylor Lodge</p>
        </footer>
      </>
    );
  },
});
