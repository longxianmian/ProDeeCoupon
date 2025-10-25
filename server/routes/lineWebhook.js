const express = require('express');
const { middleware } = require('@line/bot-sdk');
const router = express.Router();
const lineRichMenuService = require('../services/lineRichMenu');

// LINE Bot配置
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Webhook处理 - 直接使用LINE middleware处理签名验证和原始body
router.post('/webhook', middleware(config), (req, res) => {
  const events = req.body.events;

  Promise.all(events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Webhook处理错误:', err);
      res.status(500).end();
    });
});

/**
 * 处理LINE事件
 */
async function handleEvent(event) {
  try {
    console.log('📱 收到LINE事件:', event.type);

    if (event.type === 'follow') {
      // 用户关注事件 - 设置默认用户菜单
      await handleFollowEvent(event);
    } else if (event.type === 'message' && event.message.type === 'text') {
      // 文字消息事件
      await handleTextMessage(event);
    } else if (event.type === 'postback') {
      // 回传事件
      await handlePostbackEvent(event);
    }

    return null;
  } catch (error) {
    console.error('事件处理错误:', error);
    return null;
  }
}

/**
 * 处理关注事件
 */
async function handleFollowEvent(event) {
  try {
    const lineUserId = event.source.userId;
    console.log(`👋 新用户关注: ${lineUserId}`);

    // 检查用户身份并设置相应菜单
    const result = await lineRichMenuService.checkAndSwitchMenu(lineUserId);
    
    console.log(`✅ 菜单设置完成: ${result.message}`);

    // 可以发送欢迎消息
    // const { Client } = require('@line/bot-sdk');
    // const client = new Client(config);
    // await client.replyMessage(event.replyToken, {
    //   type: 'text',
    //   text: result.isStaff ? 
    //     `欢迎回来，${result.staffInfo.name}！员工工作台已为您准备就绪。` :
    //     '欢迎使用ProDee优惠券系统！查看最新优惠活动吧！'
    // });

  } catch (error) {
    console.error('处理关注事件失败:', error);
  }
}

/**
 * 处理文字消息事件
 */
async function handleTextMessage(event) {
  try {
    const lineUserId = event.source.userId;
    const text = event.message.text.toLowerCase();

    // 特殊命令处理
    if (text === '切换菜单' || text === 'refresh menu') {
      await lineRichMenuService.checkAndSwitchMenu(lineUserId);
      
      // const { Client } = require('@line/bot-sdk');
      // const client = new Client(config);
      // await client.replyMessage(event.replyToken, {
      //   type: 'text',
      //   text: '菜单已刷新！'
      // });
    }
  } catch (error) {
    console.error('处理文字消息失败:', error);
  }
}

/**
 * 处理回传事件
 */
async function handlePostbackEvent(event) {
  try {
    const lineUserId = event.source.userId;
    const postbackData = event.postback.data;

    console.log(`📤 收到回传: ${postbackData}`);

    // 根据回传数据处理不同的操作
    if (postbackData === 'refresh_menu') {
      await lineRichMenuService.checkAndSwitchMenu(lineUserId);
    }

  } catch (error) {
    console.error('处理回传事件失败:', error);
  }
}

module.exports = router;