import {
  broadcast,
  createXStateTreeMachine,
  RoutingEvent,
  type PickEvent,
} from "@koordinates/xstate-tree";
import { assign } from "@xstate/immer";
import React from "react";
import { map, filter } from "rxjs/operators";
import { createMachine } from "xstate";

import { Todo, todos$ } from "./models";
import { activeTodos, allTodos, completedTodos } from "./routes";

type Context = { todo: Todo; editedText: string };
type Events =
  | { type: "EDIT" }
  | { type: "SYNC_TODO"; todo: Todo }
  | { type: "EDIT_SUBMITTED" }
  | { type: "EDIT_CHANGED"; text: string }
  | RoutingEvent<typeof activeTodos>
  | RoutingEvent<typeof allTodos>
  | RoutingEvent<typeof completedTodos>
  | PickEvent<"TODO_DELETED" | "TODO_EDITED" | "TODO_COMPLETED_CLEARED">;

const machine =
  /** @xstate-layout N4IgpgJg5mDOIC5QBcD2FUDoAWBLCEYAdgMQDKAEgPIDqA+gIIAyTdAKlQCJVmKgAOqWLmS5URPiAAeiABwBmACyZFigIwAmNQFYNATgDsANkPaANCACeibQAZZmWRtu3tag2r0aji2-IC+-hZoGDj4hKSUtIwAwmwAkgBqAKLsXDySgsKi4pIyCCbKXmqysmqKGooG2vLyFtYIBgYOGna2Ggbyrs46gcHoWHgExOTU9DFUALIACkzJbMmcady8SCBZImISa-lG8mqYGkeybraKJ54G9YhKRn0gIVgAbrjCAEYANmCYL2AA7iRFvE2JkhJtcjtECU9CoFPJtHo9p49O1rghtEYNIdPDo9PITh1DPdHj9XrhPt9ICISBxuHQgQtOKDsls8lDSipyvI9G4jC49IiNGimrZDqY1EjSp1FMSBqT3l9MFTkIDOMC6GQAKoAIUmwMZzPB21A+XOWL58g03J5LiM5isNnOmBc5Q0siMzVkKLuQQecpeCspEGpDLoMQoDAAcgBxRaGnLG6SIc4HWTGIx7DO2TS2HxovZYvFKI57M48vSy0IB8lfUbRBhxJKpWkZNYbBNsxpeRxp5wotPuNRqfNaTBKaoVeR8moCyvPMkUuvjKazeaLZatgRgjuQrvyTB2eQedSKPRpj3C1SHDMGdSyXOtIyyOfkACakZiG-jrN3dhh8J0c4zkULo3DRTQXxbOhOGSOYDTbbcfxNGwrgdBBbkg9IwxXOD1xiOYGAAJTjBCWQhZD0VQhojgMTABQFAc7FPJQZXuIh0DgSQSSGCJv3IpMEAFIwxxA294WqSonzRfEsQlD0j1qL1dCaOd5Rrb5fj+PjE3yAxRX2ExnCMHRbwUIxhXxa8PQ9bRmk0U9VOrCklWDZBtM7CoYXogU-ExNNswsg4XBdLxb1aWdfRJJyvnc3dFGEgyvFzEzzinNEqmEl0KlvTxT20bRVMIL5kEgWKKOLFQH0MsKET0NFvG0Oj6OMVRWg8AJIoGMqBKOMcJSS4zbNS8y0O7bzqjTeL3U6QJAiAA */
  createMachine(
    {
      context: { editedText: "" } as Context,
      tsTypes: {} as import("./Todo.typegen").Typegen0,
      schema: { context: {} as Context, events: {} as Events },
      predictableActionArguments: true,
      invoke: {
        src: "syncTodo",
        id: "syncTodo",
      },
      id: "todo",
      on: {
        SYNC_TODO: {
          actions: "syncTodo",
        },
        TODO_DELETED: {
          cond: "isThisTodo",
          target: ".deleted",
        },
        TODO_COMPLETED_CLEARED: {
          cond: "isCompleted",
          target: ".deleted",
        },
      },
      initial: "visible",
      states: {
        hidden: {
          on: {
            SHOW_ALL_TODOS: {
              target: "visible",
            },
            SHOW_ACTIVE_TODOS: {
              cond: "isNotCompleted",
              target: "visible",
            },
            SHOW_COMPLETED_TODOS: {
              cond: "isCompleted",
              target: "visible",
            },
          },
        },
        visible: {
          initial: "view",
          states: {
            view: {
              on: {
                EDIT: {
                  cond: "isNotCompleted",
                  target: "edit",
                },
              },
            },
            edit: {
              entry: "setEditedText",
              on: {
                TODO_EDITED: {
                  cond: "isThisTodo",
                  target: "view",
                },
                EDIT_SUBMITTED: {
                  actions: "submitTodo",
                },
                EDIT_CHANGED: {
                  actions: "updateEditedText",
                },
              },
            },
          },
          on: {
            SHOW_ACTIVE_TODOS: {
              cond: "isCompleted",
              target: "hidden",
            },
            SHOW_COMPLETED_TODOS: {
              cond: "isNotCompleted",
              target: "hidden",
            },
          },
        },
        deleted: {
          type: "final",
        },
      },
    },
    {
      actions: {
        syncTodo: assign((ctx, e) => {
          ctx.todo = e.todo;
        }),
        submitTodo: (ctx) => {
          broadcast({
            type: "TODO_EDITED",
            id: ctx.todo.id,
            text: ctx.editedText,
          });
        },
        setEditedText: assign((ctx) => {
          ctx.editedText = ctx.todo.text;
        }),
        updateEditedText: assign((ctx, e) => {
          ctx.editedText = e.text;
        }),
      },
      guards: {
        isThisTodo: (ctx, e) => ctx.todo.id === e.id,
        isNotCompleted: (ctx) => !ctx.todo.completed,
        isCompleted: (ctx) => ctx.todo.completed,
      },
      services: {
        syncTodo: (ctx) =>
          todos$.pipe(
            map((todos) => ({
              type: "SYNC_TODO",
              todo: todos.find((todo) => todo.id === ctx.todo.id),
            })),
            filter((e) => e.todo !== undefined)
          ),
      },
    }
  );

export const TodoMachine = createXStateTreeMachine(machine, {
  selectors({ ctx, inState }) {
    return {
      text: ctx.todo.text,
      completed: ctx.todo.completed,
      id: ctx.todo.id,
      editedText: ctx.editedText,
      editing: inState("visible.edit"),
      viewing: inState("visible.view"),
    };
  },
  actions({ selectors, send }) {
    return {
      complete() {
        broadcast({
          type: "TODO_COMPLETED",
          id: selectors.id,
        });
      },
      delete() {
        broadcast({
          type: "TODO_DELETED",
          id: selectors.id,
        });
      },
      textChange(text: string) {
        send({ type: "EDIT_CHANGED", text });
      },
      submitEdit() {
        send({ type: "EDIT_SUBMITTED" });
      },
      startEditing() {
        send({ type: "EDIT" });
      },
    };
  },
  View({
    selectors: { completed, editedText, text, editing, viewing },
    actions,
  }) {
    return (
      <li
        className={completed ? "completed" : editing ? "editing" : ""}
        onDoubleClick={() => actions.startEditing()}
      >
        {viewing && (
          <div className="view">
            <input
              className="toggle"
              type="checkbox"
              onChange={actions.complete}
              checked={completed}
            />
            <label>{text}</label>
            <button className="destroy" onClick={actions.delete} />
          </div>
        )}

        {editing && (
          <input
            className="edit"
            value={editedText}
            autoFocus
            onBlur={() => actions.submitEdit()}
            onKeyDown={(e) => e.key === "Enter" && actions.submitEdit()}
            onChange={(e) => actions.textChange(e.target.value)}
          />
        )}
      </li>
    );
  },
});
