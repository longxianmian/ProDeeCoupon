/**
 * 生产级健康检查中间件
 * 提供系统状态监控、数据库连接检查和性能指标
 */

const { testConnection, getDatabaseInfo, pool } = require('../db')

// 系统启动时间
const startTime = Date.now()

// 健康状态缓存
let cachedHealthStatus = null
let lastHealthCheck = 0
const HEALTH_CACHE_DURATION = 30000 // 30秒缓存

// 基础健康检查
const getBasicHealth = () => {
  const uptime = Date.now() - startTime
  const memoryUsage = process.memoryUsage()
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime / 1000), // 秒
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
    },
    process: {
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    }
  }
}

// 数据库健康检查
const getDatabaseHealth = async () => {
  try {
    const isConnected = await testConnection(1) // 单次尝试
    
    if (!isConnected) {
      return {
        status: 'unhealthy',
        error: '数据库连接失败',
        connectionPool: {
          total: pool.totalCount || 0,
          idle: pool.idleCount || 0,
          waiting: pool.waitingCount || 0
        }
      }
    }
    
    const dbInfo = await getDatabaseInfo()
    
    return {
      status: 'healthy',
      version: dbInfo.version ? dbInfo.version.split(' ')[0] : 'unknown',
      activeConnections: dbInfo.active_connections,
      connectionPool: {
        total: dbInfo.pool_total_count,
        idle: dbInfo.pool_idle_count,
        waiting: dbInfo.pool_waiting_count
      },
      lastConnected: dbInfo.current_time
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connectionPool: {
        total: pool.totalCount || 0,
        idle: pool.idleCount || 0,
        waiting: pool.waitingCount || 0
      }
    }
  }
}

// 依赖服务检查
const getDependencyHealth = async () => {
  const dependencies = {
    database: await getDatabaseHealth()
  }
  
  // 检查LINE API连接（如果配置了）
  if (process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET) {
    dependencies.lineApi = {
      status: 'configured',
      channelId: process.env.LINE_CHANNEL_ID ? 'set' : 'missing'
    }
  }
  
  // 检查存储服务
  const fs = require('fs')
  const path = require('path')
  const uploadsDir = path.join(__dirname, '..', 'uploads')
  
  try {
    await fs.promises.access(uploadsDir, fs.constants.W_OK)
    dependencies.storage = { status: 'healthy', path: uploadsDir }
  } catch (error) {
    dependencies.storage = { 
      status: 'unhealthy', 
      error: '上传目录不可写',
      path: uploadsDir 
    }
  }
  
  return dependencies
}

// 综合健康检查
const getComprehensiveHealth = async () => {
  const now = Date.now()
  
  // 使用缓存避免频繁检查
  if (cachedHealthStatus && (now - lastHealthCheck) < HEALTH_CACHE_DURATION) {
    return cachedHealthStatus
  }
  
  try {
    const [basicHealth, dependencies] = await Promise.all([
      getBasicHealth(),
      getDependencyHealth()
    ])
    
    // 判断整体健康状态
    const isHealthy = Object.values(dependencies).every(dep => 
      dep.status === 'healthy' || dep.status === 'configured'
    )
    
    const healthStatus = {
      ...basicHealth,
      status: isHealthy ? 'healthy' : 'degraded',
      dependencies,
      checks: {
        lastCheck: new Date().toISOString(),
        nextCheck: new Date(now + HEALTH_CACHE_DURATION).toISOString()
      }
    }
    
    // 缓存结果
    cachedHealthStatus = healthStatus
    lastHealthCheck = now
    
    return healthStatus
  } catch (error) {
    const errorStatus = {
      ...getBasicHealth(),
      status: 'unhealthy',
      error: error.message,
      checks: {
        lastCheck: new Date().toISOString(),
        error: '健康检查执行失败'
      }
    }
    
    // 即使出错也缓存，避免连续失败
    cachedHealthStatus = errorStatus
    lastHealthCheck = now
    
    return errorStatus
  }
}

// 健康检查路由处理器
const healthCheckRoutes = (app) => {
  // 基础健康检查 (快速响应)
  app.get('/api/health', (req, res) => {
    const basicHealth = getBasicHealth()
    res.status(200).json(basicHealth)
  })
  
  // 详细健康检查 (包含依赖检查)
  app.get('/api/health/detailed', async (req, res) => {
    try {
      const health = await getComprehensiveHealth()
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503
      
      res.status(statusCode).json(health)
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
  
  // 数据库专用健康检查
  app.get('/api/db/health', async (req, res) => {
    try {
      const dbHealth = await getDatabaseHealth()
      const statusCode = dbHealth.status === 'healthy' ? 200 : 503
      
      res.status(statusCode).json(dbHealth)
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
  
  // 数据库连接测试
  app.get('/api/db/test', async (req, res) => {
    try {
      const isConnected = await testConnection()
      
      if (isConnected) {
        res.status(200).json({
          status: 'connected',
          message: '数据库连接正常',
          timestamp: new Date().toISOString()
        })
      } else {
        res.status(503).json({
          status: 'disconnected',
          message: '数据库连接失败',
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  })
  
  // 性能指标
  app.get('/api/metrics', async (req, res) => {
    try {
      const health = await getComprehensiveHealth()
      
      // 简化的Prometheus风格指标
      const metrics = [
        `# HELP prodee_uptime_seconds 系统运行时间`,
        `# TYPE prodee_uptime_seconds counter`,
        `prodee_uptime_seconds ${health.uptime}`,
        ``,
        `# HELP prodee_memory_usage_bytes 内存使用量`,
        `# TYPE prodee_memory_usage_bytes gauge`,
        `prodee_memory_usage_bytes{type="used"} ${health.memory.used * 1024 * 1024}`,
        `prodee_memory_usage_bytes{type="total"} ${health.memory.total * 1024 * 1024}`,
        ``,
        `# HELP prodee_database_connections 数据库连接数`,
        `# TYPE prodee_database_connections gauge`,
        `prodee_database_connections{type="total"} ${health.dependencies?.database?.connectionPool?.total || 0}`,
        `prodee_database_connections{type="idle"} ${health.dependencies?.database?.connectionPool?.idle || 0}`,
        `prodee_database_connections{type="waiting"} ${health.dependencies?.database?.connectionPool?.waiting || 0}`,
        ``
      ].join('\n')
      
      res.set('Content-Type', 'text/plain')
      res.status(200).send(metrics)
    } catch (error) {
      res.status(503).json({
        error: '指标收集失败',
        message: error.message
      })
    }
  })
}

// 健康检查中间件
const healthCheckMiddleware = (req, res, next) => {
  // 为所有响应添加健康状态头
  res.set('X-Service-Status', cachedHealthStatus?.status || 'unknown')
  res.set('X-Service-Uptime', Math.floor((Date.now() - startTime) / 1000).toString())
  
  next()
}

// 启动时健康检查
const performStartupHealthCheck = async () => {
  console.log('🔍 正在执行启动健康检查...')
  
  try {
    const health = await getComprehensiveHealth()
    
    if (health.status === 'healthy') {
      console.log('✅ 系统健康检查通过')
    } else if (health.status === 'degraded') {
      console.log('⚠️ 系统处于降级状态，部分功能可能受影响')
    } else {
      console.log('❌ 系统健康检查失败')
    }
    
    console.log('📊 系统状态概览:')
    console.log(`   - 运行时间: ${health.uptime}秒`)
    console.log(`   - 内存使用: ${health.memory.used}MB/${health.memory.total}MB`)
    console.log(`   - 数据库: ${health.dependencies.database.status}`)
    
  } catch (error) {
    console.error('❌ 启动健康检查失败:', error.message)
  }
}

module.exports = {
  healthCheckRoutes,
  healthCheckMiddleware,
  performStartupHealthCheck,
  getComprehensiveHealth
}