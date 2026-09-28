import assert from "node:assert";
import { chooseCar, nextFloor, planAfter } from "../elevator.js";
import { registerCall, selectFloor, cancelCall, step } from "../ops.js";
import { freshState, render } from "../app.js";

const scene = { top: 6, cars: [{ id: "A", pos: 1 }, { id: "B", pos: 6 }] };

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("chooseCar gives a car name", () => {
  assert.strictEqual(typeof chooseCar([{ id: "A", pos: 1, dir: "idle", plan: [] }], 3, "up"), "string");
});

check("nextFloor gives a floor", () => {
  assert.strictEqual(typeof nextFloor({ pos: 2, dir: "up", plan: [5] }), "number");
});

check("planAfter gives a plan", () => {
  assert.ok(Array.isArray(planAfter([2, 4], [3])));
});

check("registerCall gives a state", () => {
  assert.ok(Array.isArray(registerCall(freshState(scene), 3, "up", 5).cars));
});

check("selectFloor gives a state", () => {
  assert.ok(Array.isArray(selectFloor(freshState(scene), "A", 4).cars));
});

check("cancelCall gives a state", () => {
  const once = registerCall(freshState(scene), 3, "up", 5);
  assert.ok(Array.isArray(cancelCall(once, 3, "up").calls));
});

check("step gives a state with a frame number", () => {
  assert.strictEqual(typeof step(freshState(scene)).tick, "number");
});

check("render reports the fleet", () => {
  assert.ok(Array.isArray(render({ top: 6, cars: [{ id: "A", pos: 1 }], events: [{ kind: "step" }] }).cars));
});

console.log("8 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
