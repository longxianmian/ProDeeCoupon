// 前端生产环境日志工具
const isDev = import.meta.env.DEV;

export const logger = {
  // 错误日志 - 始终输出
  error: (...args) => {
    console.error(...args);
  },
  
  // 警告日志 - 始终输出
  warn: (...args) => {
    console.warn(...args);
  },
  
  // 信息日志 - 仅开发环境
  info: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  // 调试日志 - 仅开发环境
  debug: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  }
};

export default logger;
