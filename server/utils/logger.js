// 生产环境日志工具 - 根据ENABLE_DEBUG环境变量控制日志输出
const ENABLE_DEBUG = process.env.ENABLE_DEBUG === 'true';

const logger = {
  // 错误日志 - 始终输出
  error: (...args) => {
    console.error(...args);
  },
  
  // 警告日志 - 始终输出
  warn: (...args) => {
    console.warn(...args);
  },
  
  // 信息日志 - 始终输出（用于重要操作信息：CORS配置、存储初始化等）
  info: (...args) => {
    console.log(...args);
  },
  
  // 调试日志 - 仅在ENABLE_DEBUG启用时输出（用于开发调试）
  debug: (...args) => {
    if (ENABLE_DEBUG) {
      console.log(...args);
    }
  },
  
  // 关键系统日志 - 始终输出（启动、关闭等）
  system: (...args) => {
    console.log(...args);
  }
};

module.exports = logger;
