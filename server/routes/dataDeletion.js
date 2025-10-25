const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// 通知邮件发送占位函数（TODO: 替换为真实实现）
async function sendMail({ to, subject, text }) {
  console.log('📧 [邮件通知]');
  console.log('  收件人:', to);
  console.log('  主题:', subject);
  console.log('  内容:', text);
  // TODO: 集成 SES 或其他邮件服务
  return Promise.resolve();
}

// 保存删除工单占位函数（TODO: 替换为真实实现）
async function saveDeletionTicket(ticket) {
  const ticketId = 'T' + Date.now();
  console.log('💾 [保存工单]', ticketId, ticket);
  // TODO: 保存到数据库
  // 建议创建表：data_deletion_tickets (id, channel, identifier, email, note, status, created_at)
  return { id: ticketId };
}

// 标记用户待删除占位函数（TODO: 替换为真实实现）
async function markUserForDeletion(userId) {
  console.log('🗑️ [标记删除] 用户ID:', userId);
  // TODO: 在users表中添加 deleted_at 字段或 deletion_pending 标记
  // 并创建异步任务队列处理实际的数据删除/匿名化
  
  // 示例：更新用户状态
  try {
    await pool.query(
      `UPDATE users SET deletion_pending = true, deletion_requested_at = NOW() WHERE id = $1`,
      [userId]
    );
    console.log('✅ 用户已标记为待删除');
  } catch (err) {
    console.error('❌ 标记删除失败:', err);
    throw err;
  }
  
  return true;
}

/**
 * POST /api/account/delete
 * 已登录用户自助删除
 */
router.post('/account/delete', async (req, res) => {
  try {
    // 从Cookie中获取用户信息
    const sessionCookie = req.cookies?.prodee_session;
    
    if (!sessionCookie) {
      return res.status(401).json({ 
        ok: false,
        error: 'NOT_LOGIN' 
      });
    }

    // 解析JWT获取用户ID
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET未配置');
      return res.status(500).json({ 
        ok: false,
        error: 'SERVER_ERROR' 
      });
    }

    let payload;
    try {
      payload = jwt.verify(sessionCookie, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        ok: false,
        error: 'INVALID_SESSION' 
      });
    }

    const userId = payload?.userId || payload?.id;
    
    if (!userId) {
      return res.status(400).json({ 
        ok: false,
        error: 'NO_UID' 
      });
    }

    // 标记用户待删除
    await markUserForDeletion(userId);

    // 发送通知邮件给管理员
    await sendMail({
      to: 'bencothailand2024@gmail.com',
      subject: '[ProDee] 用户自助删除受理',
      text: `用户ID: ${userId}\n请求时间: ${new Date().toISOString()}\n请在30天内完成数据删除处理。`
    });

    console.log('✅ 用户删除请求已受理:', userId);

    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ 自助删除错误:', err);
    return res.status(500).json({ 
      ok: false,
      error: 'SERVER_ERROR' 
    });
  }
});

/**
 * POST /api/data-deletion-request
 * 未登录用户提交删除申请
 */
router.post('/data-deletion-request', async (req, res) => {
  try {
    const { channel, identifier, email, note } = req.body || {};

    // 验证必填字段
    if (!identifier || String(identifier).trim() === '') {
      return res.status(400).json({ 
        ok: false,
        error: 'IDENTIFIER_REQUIRED' 
      });
    }

    // 构建工单对象
    const ticket = {
      channel: channel || 'unknown',
      identifier: String(identifier).trim(),
      email: String(email || '').trim(),
      note: String(note || '').trim(),
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };

    // 保存工单
    const saved = await saveDeletionTicket(ticket);

    // 发送通知邮件给管理员
    await sendMail({
      to: 'bencothailand2024@gmail.com',
      subject: '[ProDee] 用户数据删除申请',
      text: `渠道: ${ticket.channel}
标识: ${ticket.identifier}
邮箱: ${ticket.email}
备注: ${ticket.note}
工单ID: ${saved.id}
时间: ${ticket.createdAt}

请在30天内完成数据删除处理。`
    });

    console.log('✅ 删除申请已受理:', saved.id);

    return res.json({ 
      ok: true, 
      ticketId: saved.id 
    });
  } catch (err) {
    console.error('❌ 删除申请错误:', err);
    return res.status(500).json({ 
      ok: false,
      error: 'SERVER_ERROR' 
    });
  }
});

module.exports = router;
