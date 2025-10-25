const { Client } = require('@line/bot-sdk');
const axios = require('axios');
const jwt = require('jsonwebtoken');

class LineService {
  constructor() {
    this.client = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
    });
    
    // ✅ 验证LIFF ID Token时必须使用LINE Channel ID（不带后缀的纯数字ID）
    // LIFF ID格式: 2008123620-3aeDNRR2，Channel ID格式: 2008123620
    this.channelId = process.env.LINE_CHANNEL_ID;
    this.channelSecret = process.env.LINE_CHANNEL_SECRET;
  }

  /**
   * 验证LIFF ID Token
   * @param {string} idToken - LIFF提供的ID Token
   * @returns {Promise<object>} 验证结果包含用户信息
   */
  async verifyLiffIdToken(idToken) {
    try {
      if (!idToken) {
        throw new Error('ID Token is required');
      }

      // 检查必需的配置
      if (!this.channelId) {
        console.error('❌ LINE Channel ID未配置！环境变量:', {
          LINE_LIFF_CHANNEL_ID: process.env.LINE_LIFF_CHANNEL_ID ? '已设置' : '未设置',
          LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID ? '已设置' : '未设置'
        });
        throw new Error('LINE Channel ID is not configured');
      }

      // 🔧 仅开发环境跳过验证（生产环境必须真实验证）
      const isDevMode = process.env.NODE_ENV !== 'production';
      if (isDevMode) {
        console.log('🔧 开发环境：跳过LIFF ID Token验证');
        
        // 模拟成功的验证结果
        return {
          success: true,
          userId: 'dev-user-' + Date.now(),
          name: '开发测试用户',
          picture: null,
          email: null
        };
      }

      console.log('🔍 验证LIFF ID Token:', {
        tokenLength: idToken.length,
        channelId: this.channelId.substring(0, 10) + '...'
      });

      const response = await axios.post('https://api.line.me/oauth2/v2.1/verify', 
        new URLSearchParams({
          id_token: idToken,
          client_id: this.channelId
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const verifyResult = response.data;
      
      if (!verifyResult.sub) {
        throw new Error('Invalid ID Token');
      }

      console.log('✅ LIFF ID Token验证成功:', {
        userId: verifyResult.sub,
        name: verifyResult.name,
        email: verifyResult.email
      });

      return {
        success: true,
        userId: verifyResult.sub,
        name: verifyResult.name,
        picture: verifyResult.picture,
        email: verifyResult.email
      };
    } catch (error) {
      console.error('❌ LIFF ID Token验证失败:', error.message);
      throw new Error(`ID Token verification failed: ${error.message}`);
    }
  }

  /**
   * 获取用户关注状态
   * @param {string} userId - LINE用户ID
   * @returns {Promise<object>} 关注状态信息
   */
  async getUserFollowStatus(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // 🔧 开发环境：跳过关注状态检查
      const isDevMode = process.env.NODE_ENV !== 'production';
      if (isDevMode) {
        console.log('🔧 开发环境：跳过关注状态检查，默认已关注');
        return {
          success: true,
          userId,
          isFollowing: true,
          friendFlag: true
        };
      }

      // 使用LINE Messaging API获取用户关注状态
      const response = await axios.get(
        `https://api.line.me/v2/bot/friendship/status?userId=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const followStatus = response.data;
      
      console.log('📱 用户关注状态查询:', {
        userId,
        friendFlag: followStatus.friendFlag
      });

      return {
        success: true,
        userId,
        isFollowing: followStatus.friendFlag,
        friendFlag: followStatus.friendFlag
      };
    } catch (error) {
      console.error('❌ 获取用户关注状态失败:', error.message);
      
      // 如果是403错误，可能是用户还没有与Bot互动过
      if (error.response?.status === 403) {
        return {
          success: false,
          userId,
          isFollowing: false,
          error: 'User has not interacted with the bot yet'
        };
      }
      
      throw new Error(`Failed to get follow status: ${error.message}`);
    }
  }

  /**
   * 获取用户档案信息
   * @param {string} userId - LINE用户ID
   * @returns {Promise<object>} 用户档案信息
   */
  async getUserProfile(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const profile = await this.client.getProfile(userId);
      
      console.log('👤 获取用户档案:', {
        userId,
        displayName: profile.displayName
      });

      return {
        success: true,
        profile: {
          userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
          language: profile.language
        }
      };
    } catch (error) {
      console.error('❌ 获取用户档案失败:', error.message);
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  /**
   * 发送推送消息给用户
   * @param {string} userId - LINE用户ID
   * @param {string} message - 消息内容
   * @returns {Promise<object>} 发送结果
   */
  async sendPushMessage(userId, message) {
    try {
      if (!userId || !message) {
        throw new Error('User ID and message are required');
      }

      await this.client.pushMessage(userId, {
        type: 'text',
        text: message
      });

      console.log('📤 推送消息发送成功:', { userId, message });
      
      return { success: true, message: 'Push message sent successfully' };
    } catch (error) {
      console.error('❌ 推送消息发送失败:', error.message);
      throw new Error(`Failed to send push message: ${error.message}`);
    }
  }

  /**
   * 验证用户是否已关注并且TOKEN有效
   * @param {string} idToken - LIFF ID Token
   * @returns {Promise<object>} 综合验证结果
   */
  async verifyUserAndFollow(idToken) {
    try {
      // 步骤1：验证LIFF ID Token
      const tokenVerification = await this.verifyLiffIdToken(idToken);
      
      if (!tokenVerification.success) {
        return {
          success: false,
          error: 'Invalid LIFF ID Token',
          step: 'token_verification'
        };
      }

      const userId = tokenVerification.userId;

      // 步骤2：获取用户档案
      const profileResult = await this.getUserProfile(userId);
      
      // 步骤3：检查关注状态
      const followResult = await this.getUserFollowStatus(userId);
      
      return {
        success: true,
        user: {
          userId,
          name: tokenVerification.name || profileResult.profile?.displayName,
          picture: tokenVerification.picture || profileResult.profile?.pictureUrl,
          email: tokenVerification.email
        },
        followStatus: {
          isFollowing: followResult.isFollowing,
          friendFlag: followResult.friendFlag
        },
        verified: true
      };
    } catch (error) {
      console.error('❌ 用户验证和关注检查失败:', error.message);
      return {
        success: false,
        error: error.message,
        verified: false
      };
    }
  }
}

module.exports = new LineService();