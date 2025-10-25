// server/db/query.js
const { pool } = require("./pool.js");

const TRANSIENT = new Set(["57P01","57P02","57P03","53300","08006","08001"]);

async function q(sql, params = [], attempt = 1) {
  const client = await pool.connect();
  try {
    // 借出校验：防止拿到已被上游回收的"空心连接"
    await client.query("/* ping */ SELECT 1");
    return await client.query(sql, params);
  } catch (e) {
    if (TRANSIENT.has(e.code || "") && attempt <= 3) {
      const backoff = 200 * attempt; // 线性回退
      await new Promise(r => setTimeout(r, backoff));
      return q(sql, params, attempt + 1);
    }
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { q };