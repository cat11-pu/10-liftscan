// elevator.js：派梯、下一层、目标层合并
export function chooseCar(cars, floor, dir) {
  const onTheWay = cars.filter(function (car) {
    if (car.dir !== dir) { return false; }
    return dir === "up" ? car.pos <= floor : car.pos >= floor;
  });
  const pool = onTheWay.length > 0 ? onTheWay : cars.slice();
  pool.sort(function (a, b) {
    const distA = Math.abs(a.pos - floor);
    const distB = Math.abs(b.pos - floor);
    if (distA !== distB) { return distA - distB; }
    const countA = (a.plan || []).length;
    const countB = (b.plan || []).length;
    if (countA !== countB) { return countA - countB; }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return pool.length > 0 ? pool[0].id : "";
}

export function nextFloor(car) {
  const plan = car.plan || [];
  const pos = car.pos;
  if (car.dir === "up") {
    if (plan.some(function (floor) { return floor > pos; })) { return pos + 1; }
    if (plan.some(function (floor) { return floor < pos; })) { return pos - 1; }
    return pos;
  }
  if (car.dir === "down") {
    if (plan.some(function (floor) { return floor < pos; })) { return pos - 1; }
    if (plan.some(function (floor) { return floor > pos; })) { return pos + 1; }
    return pos;
  }
  if (plan.length === 0) { return pos; }
  let best = plan[0];
  for (const floor of plan) {
    const closer = Math.abs(floor - pos) < Math.abs(best - pos);
    const lowerTie = Math.abs(floor - pos) === Math.abs(best - pos) && floor < best;
    if (closer || lowerTie) { best = floor; }
  }
  if (best === pos) { return pos; }
  return best < pos ? pos - 1 : pos + 1;
}

export function planAfter(plan, floors) {
  const merged = (plan || []).concat(floors || []);
  return Array.from(new Set(merged)).sort(function (a, b) { return a - b; });
}
