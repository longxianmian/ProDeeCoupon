const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});

async function translateContent(text, targetLanguages = ['zh-CN', 'en-US', 'th-TH']) {
  try {
    const prompt = `Please translate the following text into ${targetLanguages.join(', ')}. 
Return the result as a JSON object with language codes as keys.
Keep the original meaning and tone. For marketing content, maintain persuasive language.

Text to translate:
${text}

Return format:
{
  "zh-CN": "中文翻译",
  "en-US": "English translation",
  "th-TH": "การแปลภาษาไทย"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in marketing and promotional content. Always return valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      'zh-cn': result['zh-CN'] || result['zh-cn'] || '',
      'en-us': result['en-US'] || result['en-us'] || '',
      'th-th': result['th-TH'] || result['th-th'] || ''
    };
    
  } catch (error) {
    console.error('翻译失败:', error);
    throw new Error('翻译服务失败: ' + error.message);
  }
}

async function translatePost(title, content) {
  try {
    const [titleTranslations, contentTranslations] = await Promise.all([
      translateContent(title),
      content ? translateContent(content) : Promise.resolve({ 'zh-cn': '', 'en-us': '', 'th-th': '' })
    ]);

    return {
      title_zh_cn: titleTranslations['zh-cn'],
      title_en_us: titleTranslations['en-us'],
      title_th_th: titleTranslations['th-th'],
      content_zh_cn: contentTranslations['zh-cn'],
      content_en_us: contentTranslations['en-us'],
      content_th_th: contentTranslations['th-th']
    };
  } catch (error) {
    console.error('翻译帖子失败:', error);
    throw error;
  }
}

module.exports = {
  translateContent,
  translatePost
};
