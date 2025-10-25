const { Client } = require('@line/bot-sdk');

// LINE Client配置
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// LIFF ID
const LIFF_ID = process.env.VITE_LINE_LIFF_ID;

// Rich Menu配置
const RICH_MENUS = {
  // 普通用户菜单：首页 | 优惠券 | 我的
  USER: {
    size: {
      width: 2500,
      height: 843  // 标准高度
    },
    selected: true,
    name: 'ProDee用户菜单',
    chatBarText: '打开菜单',
    areas: [
      {
        // 首页
        bounds: {
          x: 0,
          y: 0,
          width: 833,
          height: 843
        },
        action: {
          type: 'uri',
          label: '首页',
          uri: `https://liff.line.me/${LIFF_ID}?r=/`
        }
      },
      {
        // 优惠券
        bounds: {
          x: 834,
          y: 0,
          width: 833,
          height: 843
        },
        action: {
          type: 'uri',
          label: '优惠券',
          uri: `https://liff.line.me/${LIFF_ID}?r=/coupons`
        }
      },
      {
        // 我的
        bounds: {
          x: 1667,
          y: 0,
          width: 833,
          height: 843
        },
        action: {
          type: 'uri',
          label: '我的',
          uri: `https://liff.line.me/${LIFF_ID}?openExternalBrowser=1`
        }
      }
    ]
  },
  
  // 员工菜单：门店 | 活动 | 我的
  STAFF: {
    size: {
      width: 2500,
      height: 843  // 标准高度
    },
    selected: true,
    name: 'ProDee员工菜单',
    chatBarText: '打开菜单',
    areas: [
      {
        // 门店（门店数据统计）
        bounds: {
          x: 0,
          y: 0,
          width: 833,
          height: 843
        },
        action: {
          type: 'uri',
          label: '门店',
          uri: `https://liff.line.me/${LIFF_ID}?r=/staff-store`
        }
      },
      {
        // 活动（门店参与的活动列表）
        bounds: {
          x: 834,
          y: 0,
          width: 833,
          height: 843
        },
        action: {
          type: 'uri',
          label: '活动',
          uri: `https://liff.line.me/${LIFF_ID}?r=/staff-activities`
        }
      },
      {
        // 我的（核销工具+个人记录）
        bounds: {
          x: 1667,
          y: 0,
          width: 833,
          height: 843
        },
        action: {
          type: 'uri',
          label: '我的',
          uri: `https://liff.line.me/${LIFF_ID}?r=/staff/my`
        }
      }
    ]
  }
};

class LineRichMenuService {
  constructor() {
    this.client = client;
    this.userMenuId = null;
    this.staffMenuId = null;
  }

  /**
   * 初始化Rich Menu - 创建两套菜单（幂等操作）
   */
  async initializeRichMenus() {
    try {
      console.log('🎮 初始化LINE Rich Menu...');
      
      if (!LIFF_ID) {
        throw new Error('VITE_LINE_LIFF_ID 未配置');
      }
      
      const { pool } = require('../db');
      
      // 从数据库读取已存在的菜单ID
      const existingMenus = await pool.query(`
        SELECT menu_type, rich_menu_id FROM rich_menu_configs 
        WHERE is_active = true
      `);
      
      const existingMenuMap = {};
      existingMenus.rows.forEach(row => {
        existingMenuMap[row.menu_type] = row.rich_menu_id;
      });
      
      // 创建或获取用户菜单
      if (existingMenuMap.user) {
        this.userMenuId = existingMenuMap.user;
        console.log(`✅ 使用已存在的用户菜单: ${this.userMenuId}`);
      } else {
        const userMenu = await this.client.createRichMenu(RICH_MENUS.USER);
        this.userMenuId = userMenu.richMenuId;
        
        // 持久化到数据库
        await pool.query(`
          INSERT INTO rich_menu_configs 
          (menu_type, menu_name, rich_menu_id, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, true, NOW(), NOW())
        `, ['user', 'ProDee用户菜单', this.userMenuId]);
        
        console.log(`✅ 用户菜单创建并保存成功: ${this.userMenuId}`);
      }

      // 创建或获取员工菜单
      if (existingMenuMap.staff) {
        this.staffMenuId = existingMenuMap.staff;
        console.log(`✅ 使用已存在的员工菜单: ${this.staffMenuId}`);
      } else {
        const staffMenu = await this.client.createRichMenu(RICH_MENUS.STAFF);
        this.staffMenuId = staffMenu.richMenuId;
        
        // 持久化到数据库
        await pool.query(`
          INSERT INTO rich_menu_configs 
          (menu_type, menu_name, rich_menu_id, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, true, NOW(), NOW())
        `, ['staff', 'ProDee员工菜单', this.staffMenuId]);
        
        console.log(`✅ 员工菜单创建并保存成功: ${this.staffMenuId}`);
      }

      return {
        userMenuId: this.userMenuId,
        staffMenuId: this.staffMenuId
      };
    } catch (error) {
      console.error('❌ Rich Menu初始化失败:', error);
      throw error;
    }
  }

  /**
   * 为用户设置Rich Menu
   */
  async setUserMenu(lineUserId, isStaff = false) {
    try {
      // 从数据库读取菜单ID
      if (!this.userMenuId || !this.staffMenuId) {
        const { pool } = require('../db');
        const menus = await pool.query(`
          SELECT menu_type, rich_menu_id FROM rich_menu_configs 
          WHERE is_active = true
        `);
        
        menus.rows.forEach(row => {
          if (row.menu_type === 'user') this.userMenuId = row.rich_menu_id;
          if (row.menu_type === 'staff') this.staffMenuId = row.rich_menu_id;
        });
        
        // 如果数据库中没有菜单，初始化创建
        if (!this.userMenuId || !this.staffMenuId) {
          await this.initializeRichMenus();
        }
      }

      const menuId = isStaff ? this.staffMenuId : this.userMenuId;
      const menuType = isStaff ? '员工菜单' : '用户菜单';

      await this.client.linkRichMenuToUser(lineUserId, menuId);
      
      console.log(`✅ 为用户 ${lineUserId} 设置${menuType}成功`);
      
      return {
        success: true,
        message: `${menuType}设置成功`,
        menuType: isStaff ? 'staff' : 'user'
      };
    } catch (error) {
      console.error(`❌ 设置Rich Menu失败:`, error);
      throw error;
    }
  }

  /**
   * 检查员工绑定状态并自动切换菜单
   */
  async checkAndSwitchMenu(lineUserId) {
    try {
      // 从数据库查询员工绑定状态
      const { pool } = require('../db');
      
      const result = await pool.query(`
        SELECT sb.binding_status, sp.name, sp.staff_id, s.name as store_name
        FROM staff_bindings sb
        JOIN staff_presets sp ON sb.preset_id = sp.id
        JOIN stores s ON sp.store_id = s.id
        WHERE sb.line_user_id = $1 AND sb.binding_status = 'bound'
      `, [lineUserId]);

      const isStaff = result.rows.length > 0;
      
      // 设置相应的菜单
      await this.setUserMenu(lineUserId, isStaff);
      
      return {
        success: true,
        isStaff,
        staffInfo: isStaff ? result.rows[0] : null,
        message: isStaff ? '员工菜单已激活' : '用户菜单已设置'
      };
    } catch (error) {
      console.error('❌ 检查并切换菜单失败:', error);
      throw error;
    }
  }

  /**
   * 获取已创建的Rich Menu列表
   */
  async getRichMenuList() {
    try {
      const menus = await this.client.getRichMenuList();
      return menus;
    } catch (error) {
      console.error('❌ 获取Rich Menu列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除指定的Rich Menu
   */
  async deleteRichMenu(richMenuId) {
    try {
      await this.client.deleteRichMenu(richMenuId);
      console.log(`🗑️ 删除Rich Menu成功: ${richMenuId}`);
      
      // 从数据库中删除记录
      const { pool } = require('../db');
      await pool.query(`
        DELETE FROM rich_menu_configs WHERE rich_menu_id = $1
      `, [richMenuId]);
      
      return { success: true };
    } catch (error) {
      console.error('❌ 删除Rich Menu失败:', error);
      throw error;
    }
  }

  /**
   * 清理所有Rich Menu（用于重新配置）
   */
  async cleanupRichMenus() {
    try {
      const menus = await this.getRichMenuList();
      
      for (const menu of menus) {
        await this.client.deleteRichMenu(menu.richMenuId);
        console.log(`🗑️ 删除Rich Menu: ${menu.richMenuId}`);
      }
      
      // 清空数据库记录
      const { pool } = require('../db');
      await pool.query(`DELETE FROM rich_menu_configs`);
      
      this.userMenuId = null;
      this.staffMenuId = null;
      
      console.log('✅ Rich Menu清理完成');
    } catch (error) {
      console.error('❌ Rich Menu清理失败:', error);
      throw error;
    }
  }

  /**
   * 重新配置Rich Menu（删除旧的，创建新的）
   */
  async reconfigureRichMenus() {
    try {
      console.log('🔄 开始重新配置Rich Menu...');
      
      // 1. 清理旧菜单
      await this.cleanupRichMenus();
      
      // 2. 创建新菜单
      await this.initializeRichMenus();
      
      console.log('✅ Rich Menu重新配置完成');
      return {
        userMenuId: this.userMenuId,
        staffMenuId: this.staffMenuId
      };
    } catch (error) {
      console.error('❌ Rich Menu重新配置失败:', error);
      throw error;
    }
  }
}

// 导出单例
const lineRichMenuService = new LineRichMenuService();
module.exports = lineRichMenuService;
