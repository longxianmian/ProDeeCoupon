const axios = require('axios');
require('dotenv').config();

const LIFF_ID = process.env.VITE_LINE_LIFF_ID;
const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function checkLiffConfig() {
  console.log('🔍 检查 LIFF 配置...\n');
  console.log(`LIFF ID: ${LIFF_ID?.substring(0, 15)}...`);
  
  if (!LIFF_ID || !ACCESS_TOKEN) {
    console.error('❌ 缺少必要的环境变量');
    return;
  }

  try {
    // 获取 LIFF 应用详情
    const response = await axios.get(
      `https://api.line.me/liff/v1/apps/${LIFF_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    const config = response.data;
    console.log('\n✅ LIFF 应用配置：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 应用名称: ${config.view?.name || 'N/A'}`);
    console.log(`🌐 Endpoint URL: ${config.view?.url || 'N/A'}`);
    console.log(`📏 尺寸: ${config.view?.type || 'N/A'}`);
    console.log(`📋 模块模式: ${config.view?.moduleMode !== false ? '启用' : '禁用'}`);
    console.log(`🔗 链接 Bot: ${config.features?.ble ? '启用' : '禁用'}`);
    console.log(`👥 Scopes: ${config.scope?.join(', ') || 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 检查配置建议
    console.log('📝 配置建议：');
    
    if (config.view?.type !== 'full') {
      console.log('⚠️  建议尺寸改为 "full" (全屏显示)');
    }
    
    if (!config.view?.url?.includes('replit')) {
      console.log('⚠️  Endpoint URL 可能需要更新为 Replit 域名');
    }
    
    const requiredScopes = ['profile', 'openid'];
    const hasAllScopes = requiredScopes.every(s => config.scope?.includes(s));
    if (!hasAllScopes) {
      console.log(`⚠️  建议添加 Scopes: ${requiredScopes.join(', ')}`);
    }

    // 生成 Rich Menu 深链
    console.log('\n🔗 Rich Menu 深链（可直接使用）：');
    console.log(`   首页: https://liff.line.me/${LIFF_ID}?r=/`);
    console.log(`   活动: https://liff.line.me/${LIFF_ID}?r=/`);
    console.log(`   我的: https://liff.line.me/${LIFF_ID}?openExternalBrowser=1`);

  } catch (error) {
    console.error('❌ 获取 LIFF 配置失败:', error.response?.data || error.message);
    console.log('\n💡 请手动在 LINE Developers Console 检查配置：');
    console.log('   https://developers.line.biz/console/');
  }
}

checkLiffConfig().catch(console.error);
