// server/db/pool.js
const { Pool } = require("pg");

const max = parseInt(process.env.PG_POOL_MAX || "16", 10); // 每实例连接上限（见第6节计算）

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max,                                // 每实例池大小
  idleTimeoutMillis: 30_000,          // 30s 空闲回收，避免僵尸连接
  connectionTimeoutMillis: 5_000,     // 5s 建连超时
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: true } : undefined,
});

// 池级别错误（重要）：记录并让上层可感知熔断
pool.on("error", (err) => {
  console.error("[pg-pool] idle client error", err);
});

module.exports = { pool };