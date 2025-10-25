<template>
  <div class="liff-actions">
    <h3>LINE 功能（仅在 LINE 内可用）</h3>
    
    <van-button 
      type="primary" 
      @click="onScan"
      :disabled="!isInLine"
      block
    >
      📷 扫一扫
    </van-button>
    
    <van-button 
      type="success" 
      @click="onShare"
      :disabled="!isInLine"
      block
    >
      📤 分享给好友
    </van-button>
    
    <van-button 
      type="info" 
      @click="onChat"
      :disabled="!isInLine"
      block
    >
      💬 打开与官方帐号的聊天
    </van-button>
    
    <p v-if="!isInLine" class="tip">
      提示：请在 LINE 内使用这些功能
    </p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { showToast } from 'vant';
import { isInLineApp, scanQr, shareText, openChatToOfficial } from '@/line/liffClient';

const isInLine = ref(false);

onMounted(() => {
  isInLine.value = isInLineApp();
});

const onScan = async () => {
  if (!isInLine.value) {
    showToast('请在 LINE 内使用扫码');
    return;
  }
  
  showToast.loading({ message: '打开扫码...', forbidClick: true });
  const value = await scanQr();
  showToast.clear();
  
  if (value) {
    showToast(`扫码结果：${value}`);
    console.log('扫码结果:', value);
  } else {
    showToast('未识别或取消');
  }
};

const onShare = async () => {
  if (!isInLine.value) {
    showToast('请在 LINE 内使用分享');
    return;
  }
  
  const ok = await shareText('来自 ProDee 的分享内容 🎁\n快来领取优惠券吧！');
  
  if (ok) {
    showToast.success('已分享');
  } else {
    showToast('取消或分享失败');
  }
};

const onChat = async () => {
  if (!isInLine.value) {
    showToast('请在 LINE 内使用聊天');
    return;
  }
  
  // 替换为您的官方帐号 ID
  await openChatToOfficial('@prodee');
};
</script>

<style scoped>
.liff-actions {
  padding: 16px;
}

.liff-actions h3 {
  margin-bottom: 16px;
  color: #323233;
}

.liff-actions .van-button {
  margin-bottom: 12px;
}

.tip {
  margin-top: 12px;
  color: #969799;
  font-size: 12px;
  text-align: center;
}
</style>
