import { onBroadcast } from "@koordinates/xstate-tree";
import { produce } from "immer";
import { Observable, share } from "rxjs";

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTodo(obj: any): obj is Todo {
  return (
    obj.id !== undefined &&
    typeof obj.id === "string" &&
    obj.text !== undefined &&
    typeof obj.text === "string" &&
    obj.completed !== undefined &&
    typeof obj.completed === "boolean"
  );
}

declare global {
  interface XstateTreeEvents {
    TODO_CREATED: { text: string };
    TODO_EDITED: { id: string; text: string };
    TODO_COMPLETED: { id: string };
    TODO_DELETED: { id: string };
    TODO_ALL_COMPLETED: { completed: boolean };
    TODO_COMPLETED_CLEARED: string;
  }
}

export const todos$ = new Observable<Todo[]>((subscriber) => {
  let todos = getTodos();

  subscriber.next(todos);

  return onBroadcast((event) => {
    switch (event.type) {
      case "TODO_CREATED":
        todos = produce(todos, (draft) => {
          draft.push({
            id: Math.random().toString(36).substring(2, 9),
            text: event.text,
            completed: false,
          });
        });
        break;
      case "TODO_EDITED":
        todos = produce(todos, (draft) => {
          const todo = getTodo(event.id, draft);

          if (todo) {
            todo.text = event.text;
          }
        });
        break;
      case "TODO_COMPLETED":
        todos = produce(todos, (draft) => {
          const todo = getTodo(event.id, draft);

          if (todo) {
            todo.completed = !todo.completed;
          }
        });
        break;
      case "TODO_DELETED":
        todos = produce(todos, (draft) => {
          const index = draft.findIndex((todo) => todo.id === event.id);

          if (index !== -1) {
            draft.splice(index, 1);
          }
        });
        break;
      case "TODO_ALL_COMPLETED":
        todos = produce(todos, (draft) => {
          draft.forEach((todo) => {
            todo.completed = event.completed;
          });
        });
        break;
      case "TODO_COMPLETED_CLEARED":
        todos = produce(todos, (draft) => {
          draft.forEach((todo, index) => {
            if (todo.completed) {
              draft.splice(index, 1);
            }
          });
        });
    }

    subscriber.next(todos);
  });
}).pipe(share());

todos$.subscribe(saveTodos);

function getTodo(id: string, todos: Todo[]): Todo | undefined {
  return todos.find((todo) => todo.id === id);
}

function getTodos(): Todo[] {
  try {
    const todos: unknown = JSON.parse(
      localStorage.getItem("xstate-todos") ?? "[]"
    );

    if (Array.isArray(todos)) {
      return todos.filter(isTodo);
    } else {
      return [];
    }
  } catch (e) {
    console.error("Error loading from localStorage", e);
    return [];
  }
}

function saveTodos(todos: Todo[]): void {
  try {
    localStorage.setItem("xstate-todos", JSON.stringify(todos));
  } catch (e) {
    console.error("Error saving to localStorage", e);
  }
}
