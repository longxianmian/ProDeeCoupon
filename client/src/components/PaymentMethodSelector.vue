<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    default: 'promptpay'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'THB'
  }
})

const emit = defineEmits(['update:modelValue'])

const paymentMethods = [
  {
    id: 'promptpay',
    name: 'PromptPay',
    icon: '💳',
    description: 'payment.promptpay_desc',
    available: true
  },
  {
    id: 'truemoney',
    name: 'TrueMoney Wallet',
    icon: '💰',
    description: 'payment.truemoney_desc',
    available: true
  },
  {
    id: 'internet_banking',
    name: 'Internet Banking',
    icon: '🏦',
    description: 'payment.banking_desc',
    available: true
  },
  {
    id: 'credit_card',
    name: 'Credit/Debit Card',
    icon: '💳',
    description: 'payment.card_desc',
    available: false
  }
]

const selectMethod = (methodId) => {
  emit('update:modelValue', methodId)
}
</script>

<template>
  <div class="payment-selector">
    <div class="amount-display">
      <div class="label">{{ t('payment.total_amount') }}</div>
      <div class="amount">{{ currency }} {{ amount.toFixed(2) }}</div>
    </div>

    <div class="methods-title">{{ t('payment.select_method') }}</div>
    
    <div class="methods-list">
      <div
        v-for="method in paymentMethods"
        :key="method.id"
        :class="['method-item', { 
          selected: modelValue === method.id,
          disabled: !method.available
        }]"
        @click="method.available && selectMethod(method.id)"
      >
        <div class="method-icon">{{ method.icon }}</div>
        <div class="method-info">
          <div class="method-name">{{ method.name }}</div>
          <div class="method-desc">{{ t(method.description) }}</div>
        </div>
        <div class="method-check">
          <span v-if="modelValue === method.id" class="check-icon">✓</span>
          <span v-else-if="!method.available" class="coming-soon">{{ t('payment.coming_soon') }}</span>
        </div>
      </div>
    </div>

    <div class="payment-notice">
      <p>{{ t('payment.secure_notice') }}</p>
    </div>
  </div>
</template>

<style scoped>
.payment-selector {
  padding: 16px;
}

.amount-display {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  margin-bottom: 20px;
}

.amount-display .label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.amount-display .amount {
  font-size: 32px;
  font-weight: bold;
}

.methods-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.method-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.method-item:hover:not(.disabled) {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.method-item.selected {
  border-color: #667eea;
  background: #f5f7ff;
}

.method-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.method-icon {
  font-size: 32px;
  margin-right: 16px;
}

.method-info {
  flex: 1;
}

.method-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.method-desc {
  font-size: 13px;
  color: #666;
}

.method-check {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
}

.check-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.coming-soon {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
}

.payment-notice {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.payment-notice p {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}
</style>
