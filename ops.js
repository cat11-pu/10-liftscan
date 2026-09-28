// ops.js：厅呼登记、轿内指令、撤销、逐帧推进
import { chooseCar, nextFloor, planAfter } from "./elevator.js";

function fail(code) {
  throw Object.assign(new Error(code), { code: code });
}

function clone(state) {
  return typeof structuredClone === "function"
    ? structuredClone(state)
    : JSON.parse(JSON.stringify(state));
}

function isInt(value) {
  return typeof value === "number" && Number.isInteger(value);
}

function checkFloor(state, floor) {
  if (!isInt(floor) || floor < 1 || floor > state.top) { fail("E_BAD_FLOOR"); }
}

function checkDir(dir) {
  if (dir !== "up" && dir !== "down") { fail("E_BAD_DIR"); }
}

function carById(state, carId) {
  return state.cars.find(function (car) { return car.id === carId; });
}

function planFor(state, car) {
  const floors = car.selected.slice();
  for (const call of state.calls) {
    if (call.car === car.id) { floors.push(call.floor); }
  }
  for (const ride of state.rides) {
    if (ride.car === car.id && ride.t_drop === null) { floors.push(ride.dest); }
  }
  return planAfter([], floors);
}

export function registerCall(state, floor, dir, dest) {
  checkFloor(state, floor);
  checkDir(dir);
  checkFloor(state, dest);
  if (dir === "up" && dest <= floor) { fail("E_BAD_DEST"); }
  if (dir === "down" && dest >= floor) { fail("E_BAD_DEST"); }
  if (state.calls.some(function (call) { return call.floor === floor && call.dir === dir; })) {
    fail("E_DUP_CALL");
  }
  const next = clone(state);
  const cars = next.cars.map(function (car) {
    return { id: car.id, pos: car.pos, dir: car.dir, plan: planFor(next, car) };
  });
  const carId = chooseCar(cars, floor, dir);
  if (!carById(next, carId)) { fail("E_NO_CAR"); }
  next.calls.push({ floor: floor, dir: dir, car: carId, dest: dest, t_call: next.tick });
  next.assigns.push([floor, dir, carId, next.tick]);
  return next;
}

export function selectFloor(state, carId, floor) {
  checkFloor(state, floor);
  const next = clone(state);
  if (!carById(next, carId)) { fail("E_NO_CAR"); }
  const car = carById(next, carId);
  car.selected = planAfter(car.selected, [floor]);
  return next;
}

export function cancelCall(state, floor, dir) {
  checkFloor(state, floor);
  checkDir(dir);
  const at = state.calls.findIndex(function (call) {
    return call.floor === floor && call.dir === dir;
  });
  if (at < 0) { fail("E_NO_CALL"); }
  const next = clone(state);
  next.calls.splice(at, 1);
  return next;
}

export function step(state) {
  const next = clone(state);
  next.tick += 1;
  for (const car of next.cars) {
    let dropped = 0;
    for (const ride of next.rides) {
      if (ride.car === car.id && ride.t_drop === null && ride.dest === car.pos) {
        ride.t_drop = next.tick;
        dropped += 1;
        next.drops.push([car.id, next.tick, ride.dest]);
      }
    }
    let boarded = 0;
    const served = [];
    for (const call of next.calls) {
      if (call.floor === car.pos && (call.dir === car.dir || car.dir === "idle")) {
        next.rides.push({
          car: car.id, floor: call.floor, dest: call.dest,
          t_call: call.t_call, t_board: next.tick, t_drop: null
        });
        boarded += 1;
        car.boarded += 1;
        next.boards.push([car.id, next.tick, call.floor, call.dest]);
        if (car.dir === "idle") { car.dir = call.dir; }
        served.push(call);
      }
    }
    for (const call of served) {
      const at = next.calls.indexOf(call);
      if (at >= 0) { next.calls.splice(at, 1); }
    }
    car.selected = car.selected.filter(function (floor) { return floor !== car.pos; });
    if (boarded + dropped > 0) {
      next.stops.push([car.id, next.tick, car.pos, boarded, dropped]);
      car.stops += 1;
    }
    const target = nextFloor({ pos: car.pos, dir: car.dir, plan: planFor(next, car) });
    if (target !== car.pos) {
      if (target > car.pos) { car.dir = "up"; }
      if (target < car.pos) { car.dir = "down"; }
      car.pos = target;
      car.moves += 1;
    } else {
      car.dir = "idle";
    }
  }
  for (const car of next.cars) {
    if (!next.traces[car.id]) { next.traces[car.id] = []; }
    next.traces[car.id].push(car.pos);
  }
  return next;
}
