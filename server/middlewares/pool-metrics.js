// server/middlewares/pool-metrics.js
const { pool } = require("../db/pool.js");

function poolMetrics(req, res, next) {
  if (process.env.LOG_POOL_METRICS === "true") {
    const total = pool.totalCount;   // 已创建的客户端
    const idle = pool.idleCount;     // 空闲可用
    const waiting = pool.waitingCount; // 等待队列
    console.log(`[pg-pool] total=${total} idle=${idle} waiting=${waiting}`);
  }
  next();
}

module.exports = { poolMetrics };