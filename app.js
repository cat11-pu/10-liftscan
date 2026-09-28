// app.js：跑完整事件流并把结果整理成页面要的形状
import { chooseCar, nextFloor, planAfter } from "./elevator.js";
import { registerCall, selectFloor, cancelCall, step } from "./ops.js";

export function freshState(scene) {
  return {
    top: scene.top, tick: 0,
    cars: scene.cars.map(function (c) {
      return { id: c.id, pos: c.pos, dir: "idle", selected: [], moves: 0, stops: 0, boarded: 0 };
    }),
    calls: [], rides: [], stops: [], assigns: [], boards: [], drops: [], traces: {}
  };
}

export function planFor(state, carId) {
  const floors = [];
  for (const car of state.cars) {
    if (car.id === carId) {
      for (const floor of car.selected) { floors.push(floor); }
    }
  }
  for (const call of state.calls) {
    if (call.car === carId) { floors.push(call.floor); }
  }
  for (const ride of state.rides) {
    if (ride.car === carId && ride.t_drop === null) { floors.push(ride.dest); }
  }
  return planAfter([], floors);
}

function apply(state, event) {
  if (event.kind === "call") { return registerCall(state, event.floor, event.dir, event.dest); }
  if (event.kind === "select") { return selectFloor(state, event.car, event.floor); }
  if (event.kind === "cancel") { return cancelCall(state, event.floor, event.dir); }
  if (event.kind === "step") { return step(state); }
  throw Object.assign(new Error("E_BAD_EVENT"), { code: "E_BAD_EVENT" });
}

export function render(spec) {
  let state = freshState(spec);
  const failed = [];
  for (const event of spec.events || []) {
    try {
      state = apply(state, event);
    } catch (error) {
      failed.push([event.kind, error && error.code ? error.code : "E_BAD_EVENT"]);
    }
  }
  const done = state.rides.filter(function (r) { return r.t_drop !== null; });
  const waits = state.rides.map(function (r) { return r.t_board - r.t_call; });
  const invariants = {
    no_empty_stop: state.stops.every(function (s) { return s[3] + s[4] >= 1; }),
    plan_ok: state.calls.every(function (c) { return planFor(state, c.car).indexOf(c.floor) >= 0; }),
    bounds_ok: state.cars.every(function (c) { return c.pos >= 1 && c.pos <= state.top; })
  };
  return {
    tick: state.tick,
    top: state.top,
    cars: state.cars.map(function (c) {
      return { id: c.id, pos: c.pos, dir: c.dir, plan: planFor(state, c.id),
               moves: c.moves, stops: c.stops, boarded: c.boarded };
    }),
    stops: state.stops.map(function (row) { return row.slice(); }),
    boards: state.boards.map(function (row) { return row.slice(); }),
    drops: state.drops.map(function (row) { return row.slice(); }),
    assigns: state.assigns.map(function (row) { return row.slice(); }),
    waiting: state.calls.map(function (c) { return [c.floor, c.dir, c.car]; }),
    done: done.length,
    riding: state.rides.length - done.length,
    max_wait: waits.length > 0 ? Math.max.apply(null, waits) : 0,
    total_wait: waits.reduce(function (a, b) { return a + b; }, 0),
    traces: state.cars.map(function (c) { return [c.id, (state.traces[c.id] || []).slice()]; }),
    invariants: invariants,
    failed: failed.length,
    failed_marks: failed
  };
}
