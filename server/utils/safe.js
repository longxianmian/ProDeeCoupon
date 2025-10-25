// server/utils/safe.js

/**
 * 将可能为 null/undefined 的值转为空数组，确保可安全调用 .some/.map 等
 */
function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

/**
 * 将字符串/任意输入转换为正整数；非法时返回 NaN
 */
function safeNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : NaN;
}

/**
 * 统一从常见位置提取 userId：
 * - req.user?.id
 * - req.auth?.userId
 * - res.locals.user?.id
 * - req.session?.user?.id
 */
function pickUserId(req, res) {
  return (
    req?.user?.id ??
    req?.auth?.userId ??
    res?.locals?.user?.id ??
    req?.session?.user?.id ??
    null
  );
}

module.exports = {
  safeArray,
  safeNumber,
  pickUserId
};
