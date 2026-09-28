import fs from "node:fs";
import { chooseCar, nextFloor, planAfter } from "./elevator.js";
import { registerCall, selectFloor, cancelCall, step } from "./ops.js";

const __lines = [];
function emit(label, value) {
  __lines.push([String(label).replace(/ =$/, ""), value]);
}

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/rides.json", "utf8"));

function fresh(scene) {
  return {
    top: scene.top, tick: 0,
    cars: scene.cars.map(function (c) {
      return { id: c.id, pos: c.pos, dir: "idle", selected: [], moves: 0, stops: 0, boarded: 0 };
    }),
    calls: [], rides: [], stops: [], assigns: [], boards: [], drops: [], traces: {}
  };
}

function planFor(state, carId) {
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

function drive(state, events) {
  let cur = state;
  let failed = 0;
  let callOk = 0;
  let cancelOk = 0;
  for (const event of events) {
    try {
      cur = apply(cur, event);
      if (event.kind === "call") { callOk += 1; }
      if (event.kind === "cancel") { cancelOk += 1; }
    } catch (error) {
      failed += 1;
    }
  }
  return { state: cur, failed: failed, callOk: callOk, cancelOk: cancelOk };
}

function fingerprint(state) {
  return JSON.stringify({
    tick: state.tick,
    cars: state.cars.map(function (c) { return [c.id, c.pos, c.dir, c.selected, c.moves, c.stops, c.boarded]; }),
    calls: state.calls, rides: state.rides, stops: state.stops, assigns: state.assigns,
    boards: state.boards, drops: state.drops, traces: state.traces
  });
}

const events = spec.events || [];
const run = drive(fresh(spec), events);
const final = run.state;

emit("收尾帧号", final.tick);
emit("收尾车队", final.cars.map(function (c) { return [c.id, c.pos, c.dir, planFor(final, c.id)]; }));
emit("每车统计", final.cars.map(function (c) { return [c.moves, c.stops, c.boarded]; }));
emit("到站记录", final.stops);
emit("上车记录", final.boards);
emit("下车记录", final.drops);
emit("指派记录", final.assigns);
emit("收尾等待厅呼", final.calls.map(function (c) { return [c.floor, c.dir, c.car]; }));
const done = final.rides.filter(function (r) { return r.t_drop !== null; });
emit("完成乘客数", done.length);
emit("在乘乘客数", final.rides.length - done.length);
const waits = final.rides.map(function (r) { return r.t_board - r.t_call; });
emit("最长等待", waits.length > 0 ? Math.max.apply(null, waits) : 0);
emit("总等待", waits.reduce(function (a, b) { return a + b; }, 0));
emit("无空停靠", final.stops.every(function (s) { return s[3] + s[4] >= 1; }));
emit("计划与等待一致", final.calls.every(function (c) { return planFor(final, c.car).indexOf(c.floor) >= 0; }));
emit("轨迹与移动吻合", final.cars.every(function (c) {
  const start = (spec.cars.filter(function (s) { return s.id === c.id; })[0] || {}).pos;
  const trace = final.traces[c.id] || [];
  const full = [start].concat(trace);
  let changes = 0;
  for (let at = 1; at < full.length; at += 1) {
    if (full[at] !== full[at - 1]) { changes += 1; }
  }
  return trace.length === final.tick && changes === c.moves && trace[trace.length - 1] === c.pos;
}));
emit("乘客守恒", final.rides.length + final.calls.length + run.cancelOk === run.callOk);

const probeCars = [
  { id: "A", pos: 3, dir: "up", plan: [7, 9] },
  { id: "B", pos: 9, dir: "idle", plan: [2] }
];
emit("纯函数尾测", [chooseCar(probeCars, 7, "up"), nextFloor({ pos: 5, dir: "down", plan: [2, 9] }),
                   planAfter([1, 4], [2, 4])]);

const replay = drive(fresh(spec), events);
emit("重放不新增", fingerprint(replay.state) === fingerprint(final) ? 0 : 1);
const half = Math.ceil(events.length / 2);
const left = drive(fresh(spec), events.slice(0, half));
const right = drive(left.state, events.slice(half));
emit("拆两轮收尾态一致", fingerprint(right.state) === fingerprint(final));
emit("异常事件数", run.failed);

// ---- 错误路径探针：真调用实现，看它报出什么码 ----
try {
  registerCall(fresh(spec), 13, "up", 12);
  emit("楼层越界报码", "没有报错");
} catch (error) {
  emit("楼层越界报码", error && error.code ? error.code : String(error.message));
}
try {
  selectFloor(fresh(spec), "Z", 3);
  emit("车号未知报码", "没有报错");
} catch (error) {
  emit("车号未知报码", error && error.code ? error.code : String(error.message));
}
try {
  registerCall(fresh(spec), 5, "side", 7);
  emit("方向非法报码", "没有报错");
} catch (error) {
  emit("方向非法报码", error && error.code ? error.code : String(error.message));
}
try {
  registerCall(fresh(spec), 5, "up", 2);
  emit("目的层反向报码", "没有报错");
} catch (error) {
  emit("目的层反向报码", error && error.code ? error.code : String(error.message));
}
try {
  const once = registerCall(fresh(spec), 6, "up", 9);
  registerCall(once, 6, "up", 8);
  emit("重复厅呼报码", "没有报错");
} catch (error) {
  emit("重复厅呼报码", error && error.code ? error.code : String(error.message));
}
try {
  cancelCall(fresh(spec), 4, "down");
  emit("撤销缺失报码", "没有报错");
} catch (error) {
  emit("撤销缺失报码", error && error.code ? error.code : String(error.message));
}

// ---- 期望值（参考模型算出）----
const EXPECTED = {
  "收尾帧号": 16,
  "收尾车队": [
    [
      "A",
      8,
      "up",
      [
        10
      ]
    ],
    [
      "B",
      2,
      "idle",
      []
    ]
  ],
  "每车统计": [
    [
      13,
      2,
      1
    ],
    [
      10,
      2,
      1
    ]
  ],
  "到站记录": [
    [
      "A",
      4,
      4,
      1,
      0
    ],
    [
      "B",
      5,
      9,
      1,
      0
    ],
    [
      "A",
      9,
      9,
      0,
      1
    ],
    [
      "B",
      12,
      2,
      0,
      1
    ]
  ],
  "上车记录": [
    [
      "A",
      4,
      4,
      9
    ],
    [
      "B",
      5,
      9,
      2
    ]
  ],
  "下车记录": [
    [
      "A",
      9,
      9
    ],
    [
      "B",
      12,
      2
    ]
  ],
  "指派记录": [
    [
      4,
      "up",
      "A",
      0
    ],
    [
      9,
      "down",
      "B",
      1
    ],
    [
      7,
      "up",
      "A",
      3
    ],
    [
      10,
      "down",
      "A",
      14
    ]
  ],
  "收尾等待厅呼": [
    [
      10,
      "down",
      "A"
    ]
  ],
  "完成乘客数": 2,
  "在乘乘客数": 0,
  "最长等待": 4,
  "总等待": 8,
  "无空停靠": true,
  "计划与等待一致": true,
  "轨迹与移动吻合": true,
  "乘客守恒": true,
  "纯函数尾测": [
    "A",
    4,
    [
      1,
      2,
      4
    ]
  ],
  "重放不新增": 0,
  "拆两轮收尾态一致": true,
  "异常事件数": 1,
  "楼层越界报码": "E_BAD_FLOOR",
  "车号未知报码": "E_NO_CAR",
  "方向非法报码": "E_BAD_DIR",
  "目的层反向报码": "E_BAD_DEST",
  "重复厅呼报码": "E_DUP_CALL",
  "撤销缺失报码": "E_NO_CALL"
};
function __same(got, want) {
  if (typeof got === "string") {
    try {
      const parsed = JSON.parse(got);
      if (JSON.stringify(parsed) === JSON.stringify(want)) { return true; }
    } catch (error) { }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  if (__same(found[1], want)) {
    console.log("一致 " + label + " = " + JSON.stringify(found[1]));
  } else {
    __bad += 1;
    console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(found[1]));
  }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
