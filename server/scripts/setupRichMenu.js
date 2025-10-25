const { Client } = require('@line/bot-sdk');
require('dotenv').config();

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const LIFF_ID = process.env.VITE_LINE_LIFF_ID;

async function setupRichMenu() {
  try {
    console.log('🚀 开始配置 LINE Rich Menu...');

    // 1. 创建 Rich Menu
    const richMenu = {
      size: {
        width: 2500,
        height: 843, // 或 1686 (高度)
      },
      selected: true,
      name: 'ProDee 主菜单',
      chatBarText: '打开菜单',
      areas: [
        {
          // 首页按钮（左）
          bounds: {
            x: 0,
            y: 0,
            width: 833,
            height: 843,
          },
          action: {
            type: 'uri',
            label: '首页',
            uri: `https://liff.line.me/${LIFF_ID}?r=/`,
          },
        },
        {
          // 活动按钮（中）
          bounds: {
            x: 834,
            y: 0,
            width: 833,
            height: 843,
          },
          action: {
            type: 'uri',
            label: '活动',
            uri: `https://liff.line.me/${LIFF_ID}?r=/`,
          },
        },
        {
          // 我的按钮（右）
          bounds: {
            x: 1667,
            y: 0,
            width: 833,
            height: 843,
          },
          action: {
            type: 'uri',
            label: '我的',
            uri: `https://liff.line.me/${LIFF_ID}?openExternalBrowser=1`,
          },
        },
      ],
    };

    const richMenuId = await client.createRichMenu(richMenu);
    console.log('✅ Rich Menu 创建成功，ID:', richMenuId);

    // 2. 设置为默认菜单（所有用户）
    await client.setDefaultRichMenu(richMenuId);
    console.log('✅ 已设置为默认菜单');

    console.log('\n📋 下一步：');
    console.log('1. 准备 Rich Menu 图片（2500x843 px）');
    console.log('2. 运行以下命令上传图片：');
    console.log(`   curl -X POST https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content \\`);
    console.log(`     -H "Authorization: Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}" \\`);
    console.log(`     -H "Content-Type: image/png" \\`);
    console.log(`     --data-binary "@richmenu.png"`);
    
  } catch (error) {
    console.error('❌ Rich Menu 配置失败:', error.message);
    throw error;
  }
}

// 执行配置
setupRichMenu().catch(console.error);
