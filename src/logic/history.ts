// Undo history: the current state plus up to `limit` earlier ones.

export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present };
}

/** Makes `next` the current state, remembering the old one (dropping the oldest past `limit`). */
export function commit<T>(history: History<T>, next: T, limit: number): History<T> {
  const past = [...history.past, history.present].slice(-limit);
  return { past, present: next };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

/** Goes back one step. Does nothing if there is nothing to undo. */
export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (previous === undefined) return history;
  return { past: history.past.slice(0, -1), present: previous };
}
