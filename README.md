# liftscan

电梯群控轨迹屏（原生 ES 模块，零依赖）：上面是状态条，中间是时间楼层轨迹画布，底部是事件流与操作按钮。派梯看顺路、距离、目标层数、车号；轿厢按 SCAN 逐帧走，方向不合的厅呼等轿厢掉头回来再接。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ 即可操作。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js
