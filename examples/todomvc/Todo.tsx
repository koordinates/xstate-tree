import {
  broadcast,
  createXStateTreeMachine,
  RoutingEvent,
  type PickEvent,
} from "@koordinates/xstate-tree";
import React from "react";
import { map, filter } from "rxjs/operators";
import { assertEvent, assign, fromEventObservable, setup } from "xstate";

import { assert } from "../../src/utils";

import { Todo, todos$ } from "./models";
import { activeTodos, allTodos, completedTodos } from "./routes";

const syncTodo$ = fromEventObservable(({ input }: { input: string }) =>
  todos$.pipe(
    map(
      (todos) =>
        ({
          type: "SYNC_TODO",
          todo: todos.find((todo) => todo.id === input)!,
        } as const)
    ),
    filter((e) => e.todo !== undefined)
  )
);

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
  setup({
    types: { context: {} as Context, events: {} as Events, input: {} as Todo },
    actions: {
      syncTodo: assign({
        todo: ({ event: e }) => {
          assertEvent(e, "SYNC_TODO");

          return e.todo;
        },
      }),
      submitTodo: ({ context: ctx }) => {
        broadcast({
          type: "TODO_EDITED",
          id: ctx.todo.id,
          text: ctx.editedText,
        });
      },
      setEditedText: assign({
        editedText: ({ context: ctx }) => {
          return ctx.todo.text;
        },
      }),
      updateEditedText: assign({
        editedText: ({ event: e }) => {
          assertEvent(e, "EDIT_CHANGED");
          return e.text;
        },
      }),
    },
    guards: {
      isThisTodo: ({ context: ctx, event: e }) => {
        assert("id" in e);
        return ctx.todo.id === e.id;
      },
      isNotCompleted: ({ context: ctx }) => !ctx.todo.completed,
      isCompleted: ({ context: ctx }) => ctx.todo.completed,
    },
    actors: {
      syncTodo: syncTodo$,
    },
  }).createMachine({
    context: ({ input }) => ({ editedText: "", todo: input }),
    invoke: {
      src: "syncTodo",
      input: ({ context }) => context.todo.id,
    },
    id: "todo",
    on: {
      SYNC_TODO: {
        actions: "syncTodo",
      },
      TODO_DELETED: {
        guard: "isThisTodo",
        target: ".deleted",
      },
      TODO_COMPLETED_CLEARED: {
        guard: "isCompleted",
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
            guard: "isNotCompleted",
            target: "visible",
          },
          SHOW_COMPLETED_TODOS: {
            guard: "isCompleted",
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
                guard: "isNotCompleted",
                target: "edit",
              },
            },
          },
          edit: {
            entry: "setEditedText",
            on: {
              TODO_EDITED: {
                guard: "isThisTodo",
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
            guard: "isCompleted",
            target: "hidden",
          },
          SHOW_COMPLETED_TODOS: {
            guard: "isNotCompleted",
            target: "hidden",
          },
        },
      },
      deleted: {
        type: "final",
      },
    },
  });

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
    console.log("From Todo view");
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
