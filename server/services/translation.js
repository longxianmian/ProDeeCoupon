/**
 * 阿里云QWEN翻译服务
 * 支持中文、英文、泰文三语言互译
 */

const axios = require('axios');

class QwenTranslationService {
  constructor() {
    this.apiKey = process.env.QWEN_API_KEY;
    this.baseURL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    
    if (!this.apiKey) {
      console.warn('⚠️  QWEN_API_KEY未设置，翻译功能将不可用');
    }
  }

  /**
   * 调用QWEN API进行翻译
   * @param {string} text - 要翻译的文本
   * @param {string} targetLang - 目标语言 (zh-cn, en-us, th-th)
   * @param {string} sourceLang - 源语言 (可选，自动检测)
   * @returns {Promise<string>} 翻译结果
   */
  async translateText(text, targetLang, sourceLang = 'auto') {
    if (!this.apiKey) {
      throw new Error('QWEN API密钥未配置');
    }

    if (!text || text.trim() === '') {
      return text;
    }

    try {
      const langMap = {
        'zh-cn': '中文',
        'en-us': '英语', 
        'th-th': '泰语'
      };

      const targetLanguage = langMap[targetLang] || '英语';
      
      const prompt = `请将以下文本翻译成${targetLanguage}，保持原意和语言风格，特别注意商业用语的准确性：

原文：${text}

翻译：`;

      const response = await axios.post(this.baseURL, {
        model: "qwen-turbo",
        input: {
          messages: [
            {
              role: "system",
              content: "你是专业的多语言翻译专家，特别擅长中文、英文、泰语之间的翻译。请提供准确、自然、符合当地语言习惯的翻译，特别注意商业和优惠券相关术语。"
            },
            {
              role: "user",
              content: prompt
            }
          ]
        },
        parameters: {
          result_format: "message",
          temperature: 0.3,
          top_p: 0.8,
          max_tokens: 2000
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.output && response.data.output.choices) {
        const translatedText = response.data.output.choices[0].message.content.trim();
        // 清理可能的前缀文字
        return translatedText.replace(/^翻译[：:]\s*/, '').replace(/^译文[：:]\s*/, '');
      } else {
        throw new Error('QWEN API响应格式异常');
      }
    } catch (error) {
      console.error('🚨 QWEN翻译失败:', error.message);
      if (error.response) {
        console.error('API响应:', error.response.data);
      }
      throw new Error(`翻译失败: ${error.message}`);
    }
  }

  /**
   * 批量翻译对象的多个字段
   * @param {Object} content - 包含要翻译字段的对象
   * @param {Array} fields - 要翻译的字段名数组
   * @param {string} targetLang - 目标语言
   * @returns {Promise<Object>} 翻译后的对象
   */
  async translateFields(content, fields, targetLang) {
    const result = { ...content };
    
    for (const field of fields) {
      if (content[field]) {
        try {
          result[`${field}_${targetLang.replace('-', '_')}`] = await this.translateText(
            content[field], 
            targetLang
          );
          
          // 添加小延迟避免频率限制
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`🚨 字段 ${field} 翻译失败:`, error.message);
          result[`${field}_${targetLang.replace('-', '_')}`] = content[field]; // 使用原文作为fallback
        }
      }
    }
    
    return result;
  }

  /**
   * 为优惠券内容生成多语言版本
   * @param {Object} coupon - 优惠券对象 {title, description}
   * @returns {Promise<Object>} 包含所有语言版本的对象
   */
  async translateCoupon(coupon) {
    console.log('🌍 开始翻译优惠券内容...');
    
    const result = {
      // 保留原始字段作为中文版本
      title_zh_cn: coupon.title,
      description_zh_cn: coupon.description,
    };

    try {
      // 翻译为英文
      console.log('📝 翻译为英文...');
      const englishResult = await this.translateFields(coupon, ['title', 'description'], 'en-us');
      result.title_en_us = englishResult.title_en_us;
      result.description_en_us = englishResult.description_en_us;

      // 翻译为泰文  
      console.log('📝 翻译为泰文...');
      const thaiResult = await this.translateFields(coupon, ['title', 'description'], 'th-th');
      result.title_th_th = thaiResult.title_th_th;
      result.description_th_th = thaiResult.description_th_th;

      console.log('✅ 优惠券翻译完成');
      return result;
    } catch (error) {
      console.error('🚨 优惠券翻译失败:', error.message);
      throw error;
    }
  }

  /**
   * 为门店信息生成多语言版本
   * @param {Object} store - 门店对象 {name, address}
   * @returns {Promise<Object>} 包含所有语言版本的对象
   */
  async translateStore(store) {
    console.log('🏪 开始翻译门店信息...');
    
    const result = {
      // 保留原始字段作为中文版本
      name_zh_cn: store.name,
      address_zh_cn: store.address,
    };

    try {
      // 翻译为英文
      const englishResult = await this.translateFields(store, ['name', 'address'], 'en-us');
      result.name_en_us = englishResult.name_en_us;
      result.address_en_us = englishResult.address_en_us;

      // 翻译为泰文
      const thaiResult = await this.translateFields(store, ['name', 'address'], 'th-th');
      result.name_th_th = thaiResult.name_th_th;
      result.address_th_th = thaiResult.address_th_th;

      console.log('✅ 门店信息翻译完成');
      return result;
    } catch (error) {
      console.error('🚨 门店信息翻译失败:', error.message);
      throw error;
    }
  }

  /**
   * 为视频/文章内容生成多语言版本
   * @param {Object} post - 内容对象 {title, content}
   * @returns {Promise<Object>} 包含所有语言版本的对象
   */
  async translatePost(post) {
    console.log('📺 开始翻译内容...');
    
    const result = {
      // 保留原始字段作为中文版本
      title_zh_cn: post.title,
      content_zh_cn: post.content,
    };

    try {
      // 翻译为英文
      console.log('📝 翻译为英文...');
      const englishResult = await this.translateFields(post, ['title', 'content'], 'en-us');
      result.title_en_us = englishResult.title_en_us;
      result.content_en_us = englishResult.content_en_us;

      // 翻译为泰文  
      console.log('📝 翻译为泰文...');
      const thaiResult = await this.translateFields(post, ['title', 'content'], 'th-th');
      result.title_th_th = thaiResult.title_th_th;
      result.content_th_th = thaiResult.content_th_th;

      console.log('✅ 内容翻译完成');
      return result;
    } catch (error) {
      console.error('🚨 内容翻译失败:', error.message);
      throw error;
    }
  }

  /**
   * 为积分商城商品生成多语言版本
   * @param {Object} reward - 商品对象 {title, description}
   * @returns {Promise<Object>} 包含所有语言版本的对象
   */
  async translateReward(reward) {
    console.log('🎁 开始翻译积分商品...');
    
    const result = {
      // 保留原始字段作为中文版本
      title_zh_cn: reward.title,
      description_zh_cn: reward.description,
    };

    try {
      // 翻译为英文
      console.log('📝 翻译为英文...');
      const englishResult = await this.translateFields(reward, ['title', 'description'], 'en-us');
      result.title_en_us = englishResult.title_en_us;
      result.description_en_us = englishResult.description_en_us;

      // 翻译为泰文  
      console.log('📝 翻译为泰文...');
      const thaiResult = await this.translateFields(reward, ['title', 'description'], 'th-th');
      result.title_th_th = thaiResult.title_th_th;
      result.description_th_th = thaiResult.description_th_th;

      console.log('✅ 积分商品翻译完成');
      return result;
    } catch (error) {
      console.error('🚨 积分商品翻译失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查翻译服务状态
   * @returns {Promise<boolean>} 服务是否可用
   */
  async checkStatus() {
    if (!this.apiKey) {
      return { available: false, error: 'API密钥未配置' };
    }

    try {
      // 测试简单翻译
      await this.translateText('测试', 'en-us');
      return { available: true };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }
}

// 创建单例实例
const translationService = new QwenTranslationService();

module.exports = {
  QwenTranslationService,
  translationService
};