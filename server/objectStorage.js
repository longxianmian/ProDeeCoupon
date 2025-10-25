// server/objectStorage.js - Replit App Storage Integration (官方客户端)
const { Client } = require('@replit/object-storage');
const { randomUUID } = require('crypto');

class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service using official Replit client
class ObjectStorageService {
  constructor() {
    this.client = null;
    this.isObjectStorageEnabled = false;
    this.initPromise = this.initializeClient();
    console.log(`🪣 对象存储模式: 正在初始化（Replit App Storage 官方客户端）`);
  }

  async initializeClient() {
    try {
      // 创建客户端
      this.client = new Client();
      
      // 非阻塞初始化：快速测试一次，不等待
      try {
        await Promise.race([
          this.client.list(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
        ]);
        this.isObjectStorageEnabled = true;
        console.log(`✅ 对象存储初始化成功 (prodee-storage)`);
      } catch (quickTestError) {
        // 快速测试失败，在后台异步重试，不阻塞启动
        console.log(`⏳ 对象存储尚未就绪，在后台初始化中...`);
        this.retryInitInBackground();
      }
      
      return true;
    } catch (error) {
      console.warn(`⚠️ 对象存储创建失败: ${error.message}，将使用本地存储作为回退`);
      this.isObjectStorageEnabled = false;
      this.client = null;
      return false;
    }
  }
  
  // 后台异步重试初始化，不阻塞主进程
  async retryInitInBackground() {
    let retries = 10;
    
    while (retries > 0 && !this.isObjectStorageEnabled) {
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.client.list();
        this.isObjectStorageEnabled = true;
        console.log(`✅ 对象存储后台初始化成功 (prodee-storage)`);
        return;
      } catch (err) {
        retries--;
        if (retries > 0) {
          console.log(`⏳ 对象存储后台重试中... (剩余${retries}次)`);
        }
      }
    }
    
    if (!this.isObjectStorageEnabled) {
      console.warn(`⚠️ 对象存储后台初始化失败，将使用本地存储作为回退`);
      this.client = null;
    }
  }

  // 上传文件到对象存储
  async uploadFile(fileBuffer, filename, mimetype, folder = 'campaigns/images') {
    const objectId = randomUUID();
    const extension = filename.split('.').pop();
    const objectName = `uploads/${folder}/${objectId}.${extension}`;
    
    try {
      // 等待客户端初始化完成
      await this.initPromise;
      
      // 检查对象存储是否可用
      if (!this.isObjectStorageEnabled || !this.client) {
        throw new Error('对象存储不可用，请使用本地存储');
      }
      
      console.log(`[${new Date().toISOString()}] 上传文件到Replit对象存储:`, objectName);
      console.log(`📦 [UPLOAD-DEBUG] fileBuffer类型:`, typeof fileBuffer, `是Buffer:`, Buffer.isBuffer(fileBuffer));
      console.log(`📦 [UPLOAD-DEBUG] fileBuffer长度:`, fileBuffer?.length || 'undefined');
      console.log(`📦 [UPLOAD-DEBUG] fileBuffer内容预览:`, fileBuffer ? fileBuffer.slice(0, 20) : 'null');
      
      // 使用官方客户端上传
      const { ok, error } = await this.client.uploadFromBytes(
        objectName,
        fileBuffer
      );
      
      if (!ok) {
        throw new Error(error || '上传失败');
      }
      
      console.log(`✅ 文件上传到对象存储成功: ${objectName}`);
      
      return {
        objectPath: `/${objectName}`,
        objectId: objectId,
        filename: `${objectId}.${extension}`,
        originalName: filename,
        mimetype: mimetype,
        storage: 'object'
      };
    } catch (error) {
      console.error('对象存储上传失败:', error);
      throw new Error(`对象存储失败: ${error.message || error.code || 'unknown error'}`);
    }
  }

  // 获取对象文件
  async getObjectFile(objectPath) {
    try {
      // 移除前导斜杠
      const normalizedPath = objectPath.startsWith('/') ? objectPath.slice(1) : objectPath;
      
      const { ok, value, error } = await this.client.downloadAsBytes(normalizedPath);
      
      if (!ok) {
        throw new ObjectNotFoundError();
      }
      
      // 关键修复：downloadAsBytes返回的是[Buffer]数组，需要取第一个元素
      const buffer = Array.isArray(value) ? value[0] : value;
      
      return { 
        type: 'object', 
        data: buffer,
        path: normalizedPath
      };
    } catch (error) {
      // 正常回退逻辑，不需要打印错误日志
      throw new ObjectNotFoundError();
    }
  }

  // 下载对象到响应流
  async downloadObject(fileData, res) {
    try {
      if (fileData.type === 'object') {
        // 根据文件路径确定Content-Type
        const filePath = fileData.path || '';
        const ext = filePath.split('.').pop().toLowerCase();
        
        const mimeTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        console.log(`📦 [DOWNLOAD] 文件路径: ${filePath}`);
        console.log(`📦 [DOWNLOAD] 扩展名: ${ext}`);
        console.log(`📦 [DOWNLOAD] Content-Type: ${contentType}`);
        console.log(`📦 [DOWNLOAD] 数据大小: ${fileData.data?.length || 0} bytes`);
        console.log(`📦 [DOWNLOAD] 数据类型: ${typeof fileData.data}`);
        
        // 设置响应头（保留已设置的CORP头和缓存头，不覆盖）
        if (!res.getHeader('Cross-Origin-Resource-Policy')) {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
        if (!res.getHeader('Access-Control-Allow-Origin')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
        
        // 🚀 CDN优化：保留handleFileRequest中设置的缓存头，只设置Content相关头
        // 不使用res.set()以免覆盖已设置的Cache-Control等头部
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileData.data.length);

        console.log(`📦 [DOWNLOAD] 响应头已设置，准备发送数据`);

        // 发送文件数据
        res.send(Buffer.from(fileData.data));
        
        console.log(`✅ [DOWNLOAD] 文件发送完成`);
      } else {
        throw new Error('未知的文件类型');
      }
    } catch (error) {
      console.error('❌ [DOWNLOAD] 下载对象失败:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '下载文件失败' });
      }
    }
  }

  // 列出存储桶内容（调试用）
  async listObjects() {
    try {
      const { ok, value, error } = await this.client.list();
      if (!ok) {
        console.error('列出对象失败:', error);
        return [];
      }
      return value;
    } catch (error) {
      console.error('列出对象失败:', error);
      return [];
    }
  }
}

// CommonJS 兼容性导出
module.exports = {
  ObjectStorageService,
  ObjectNotFoundError
};