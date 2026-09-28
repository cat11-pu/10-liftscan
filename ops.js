// ops.js：厅呼登记、轿内指令、撤销、逐帧推进（基线：一律原样返回）
import { chooseCar, nextFloor, planAfter } from "./elevator.js";

export function registerCall(state, floor, dir, dest) {
  return state;
}

export function selectFloor(state, carId, floor) {
  return state;
}

export function cancelCall(state, floor, dir) {
  return state;
}

export function step(state) {
  return state;
}
