/**
 * QWEN API 翻译服务
 * 负责调用QWEN API进行多语言翻译
 */

const QwenAPI = {
  baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
  apiKey: process.env.QWEN_API_KEY,
  
  /**
   * 调用QWEN API进行翻译
   * @param {string} text - 要翻译的文本
   * @param {string} targetLang - 目标语言 (zh-cn, en-us, th-th)
   * @param {string} sourceLang - 源语言，可选
   * @returns {Promise<string>} 翻译后的文本
   */
  async translate(text, targetLang, sourceLang = 'auto') {
    if (!text || !text.trim()) return ''
    if (!this.apiKey) {
      console.error('QWEN_API_KEY not found in environment variables')
      // 对于非源语言，返回null避免污染其他语言字段
      if (sourceLang !== targetLang) {
        return null
      }
      return text // 只有源语言才返回原文本
    }

    const langMapping = {
      'zh-cn': '简体中文',
      'en-us': '英语',
      'th-th': '泰语'
    }

    const targetLanguage = langMapping[targetLang] || '英语'
    
    // 如果源语言和目标语言相同，直接返回
    if (sourceLang === targetLang) return text

    const prompt = `请将以下文本翻译成${targetLanguage}，要求：
1. 保持原意准确
2. 语言自然流畅
3. 符合当地文化习惯
4. 如果是商业内容，使用营销语言
5. 只返回翻译结果，不要包含其他解释

原文：${text}`

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          input: {
            messages: [{
              role: 'user',
              content: prompt
            }]
          },
          parameters: {
            temperature: 0.3, // 较低的温度确保翻译稳定性
            max_tokens: 2000,
            top_p: 0.8
          }
        })
      })

      if (!response.ok) {
        throw new Error(`QWEN API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // 验证响应格式 - QWEN API返回的是 data.output.text 格式
      if (!data || !data.output || !data.output.text) {
        console.error('QWEN API响应格式错误:', JSON.stringify(data, null, 2))
        return sourceLang === targetLang ? text : null
      }
      
      const translatedText = data.output.text.trim()
      console.log(`✅ 翻译成功: ${targetLanguage} - ${text.substring(0, 50)}...`)
      return translatedText
    } catch (error) {
      console.error(`❌ QWEN翻译失败 [${targetLang}]:`, error.message)
      console.error('原文本:', text)
      // 对于非源语言，返回null避免污染其他语言字段
      if (sourceLang !== targetLang) {
        return null
      }
      return text // 只有源语言才返回原文本
    }
  },

  /**
   * 批量翻译多个字段
   * @param {Object} content - 包含要翻译字段的对象
   * @param {Array<string>} fields - 要翻译的字段名列表
   * @param {string} sourceLang - 源语言
   * @returns {Promise<Object>} 包含所有语言版本的对象
   */
  async translateFields(content, fields = ['title', 'description'], sourceLang = 'zh-cn') {
    const targetLangs = ['zh-cn', 'en-us', 'th-th']
    const result = {}

    for (const field of fields) {
      const originalText = content[field]
      if (!originalText) continue

      for (const lang of targetLangs) {
        const fieldKey = `${field}_${lang.replace('-', '_')}`
        
        if (lang === sourceLang) {
          // 源语言直接使用原文
          result[fieldKey] = originalText
        } else {
          // 其他语言进行翻译
          try {
            result[fieldKey] = await this.translate(originalText, lang, sourceLang)
            // 添加小延迟避免API频率限制
            await new Promise(resolve => setTimeout(resolve, 500))
          } catch (error) {
            console.error(`翻译字段 ${fieldKey} 失败:`, error)
            // 对于非源语言，设为null避免污染
            result[fieldKey] = (lang === sourceLang) ? originalText : null
          }
        }
      }
    }

    return result
  },

  /**
   * 翻译优惠券内容
   * @param {Object} couponData - 优惠券数据
   * @returns {Promise<Object>} 包含多语言版本的优惠券数据
   */
  async translateCoupon(couponData) {
    console.log('🌐 开始翻译优惠券内容...')
    
    const translations = await this.translateFields(couponData, ['title', 'description'])
    
    return {
      ...couponData,
      ...translations
    }
  },

  /**
   * 翻译门店内容
   * @param {Object} storeData - 门店数据
   * @returns {Promise<Object>} 包含多语言版本的门店数据
   */
  async translateStore(storeData) {
    console.log('🌐 开始翻译门店内容...')
    
    const translations = await this.translateFields(storeData, ['name', 'address'])
    
    return {
      ...storeData,
      ...translations
    }
  },

  /**
   * 翻译用户评论/内容
   * @param {string} text - 评论文本
   * @param {string} targetLang - 目标语言
   * @param {string} sourceLang - 源语言（检测到的语言）
   * @returns {Promise<string>} 翻译后的文本
   */
  async translateComment(text, targetLang, sourceLang = 'auto') {
    console.log('💬 开始翻译用户评论...')
    return this.translate(text, targetLang, sourceLang)
  },

  /**
   * 翻译内容（视频/文章）
   * @param {Object} postData - 内容数据
   * @returns {Promise<Object>} 包含多语言版本的内容数据
   */
  async translatePost(postData) {
    console.log('📺 开始翻译内容...')
    
    const translations = await this.translateFields(postData, ['title', 'content'])
    
    return {
      ...postData,
      ...translations
    }
  },

  /**
   * 检测文本语言
   * @param {string} text - 要检测的文本
   * @returns {Promise<string>} 检测到的语言代码
   */
  async detectLanguage(text) {
    if (!text || !text.trim()) return 'zh-cn'

    const prompt = `请检测以下文本的语言，只返回语言代码：zh-cn（简体中文）、en-us（英语）、th-th（泰语）之一。

文本：${text}`

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          input: {
            messages: [{
              role: 'user',
              content: prompt
            }]
          },
          parameters: {
            temperature: 0.1,
            max_tokens: 50
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const detected = data.output?.choices?.[0]?.message?.content?.trim().toLowerCase()
        
        if (['zh-cn', 'en-us', 'th-th'].includes(detected)) {
          return detected
        }
      }
    } catch (error) {
      console.error('语言检测失败:', error)
    }

    // 使用简单规则作为备选
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-cn'
    if (/[ก-๙]/.test(text)) return 'th-th'
    return 'en-us'
  }
}

module.exports = QwenAPI