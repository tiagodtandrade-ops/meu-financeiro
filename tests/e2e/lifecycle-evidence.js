// Native events are recorded before app modules load. No warnings are filtered.
export function traceIndexedDB() {
  const events = (window.databaseEvents = []);
  const connections = new Map();
  const ids = new WeakMap();
  let sequence = 0;
  const record = (event, detail = {}) => events.push({ event, ...detail });
  function connection(db) {
    if (ids.has(db)) return connections.get(ids.get(db));
    const state = {
      id: ++sequence,
      name: db.name,
      closing: false,
      pending: [],
    };
    ids.set(db, state.id);
    connections.set(state.id, state);
    record("connection", { ...state });
    db.addEventListener("versionchange", (e) =>
      record("versionchange", { id: state.id, newVersion: e.newVersion }),
    );
    db.addEventListener("close", () =>
      record("forced-close", { id: state.id }),
    );
    return state;
  }
  const tracked = new WeakSet();
  function transaction(tx) {
    if (!tx || tracked.has(tx)) return;
    tracked.add(tx);
    const state = connection(tx.db);
    const id = ++sequence;
    state.pending.push(id);
    record("transaction", {
      connection: state.id,
      id,
      mode: tx.mode,
      stores: [...tx.objectStoreNames],
    });
    for (const type of ["complete", "abort"])
      tx.addEventListener(type, () => {
        state.pending = state.pending.filter((n) => n !== id);
        record(type, { connection: state.id, id });
      });
  }
  const originalTransaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (...args) {
    const tx = originalTransaction.apply(this, args);
    transaction(tx);
    return tx;
  };
  const originalClose = IDBDatabase.prototype.close;
  IDBDatabase.prototype.close = function () {
    const state = connection(this);
    state.closing = true;
    record("close-called", { ...state, pending: [...state.pending] });
    return originalClose.call(this);
  };
  for (const operation of ["open", "deleteDatabase"]) {
    const original = IDBFactory.prototype[operation];
    IDBFactory.prototype[operation] = function (...args) {
      const request = original.apply(this, args);
      const name = args[0];
      const snapshot = () =>
        [...connections.values()]
          .filter((c) => c.name === name)
          .map((c) => ({ ...c, pending: [...c.pending] }));
      record(operation, { name, connections: snapshot() });
      request.addEventListener("upgradeneeded", () => {
        connection(request.result);
        transaction(request.transaction);
      });
      request.addEventListener("success", () => {
        if (operation === "open") connection(request.result);
        record(`${operation}-success`, { name, connections: snapshot() });
      });
      request.addEventListener("error", () =>
        record(`${operation}-error`, { name, error: request.error?.name }),
      );
      request.addEventListener("blocked", () =>
        record(`${operation}-blocked`, { name, connections: snapshot() }),
      );
      return request;
    };
  }
}

export function traceFocus() {
  const events = (window.focusEvents = []);
  const describe = (node) =>
    node
      ? {
          tag: node.tagName,
          text: node.textContent?.slice(0, 45),
          disabled: Boolean(node.disabled),
          connected: node.isConnected,
        }
      : null;
  const record = (event, target) =>
    events.push({
      event,
      target: describe(target),
      active: describe(document.activeElement),
    });
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (...args) {
    record("focus-call", this);
    const result = focus.apply(this, args);
    record("focus-return", this);
    return result;
  };
  const close = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.close = function (...args) {
    record("close-call", this);
    const result = close.apply(this, args);
    record("close-return", this);
    return result;
  };
  for (const type of ["focusin", "focusout", "close", "cancel"])
    document.addEventListener(type, (e) => record(type, e.target), true);
  new MutationObserver((entries) => {
    for (const entry of entries)
      record(`attribute-${entry.attributeName}`, entry.target);
  }).observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled", "open"],
  });
  window.recordFocus = (event) => record(event, document.activeElement);
}
