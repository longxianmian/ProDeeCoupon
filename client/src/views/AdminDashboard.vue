<template>
  <div class="admin-dashboard">
    <!-- 侧边栏 -->
    <el-aside width="250px" class="sidebar">
      <div class="logo-section">
        <div class="logo-placeholder">P</div>
        <h3 class="brand-title">ProDee Admin</h3>
      </div>
      
      <el-menu 
        :default-active="activeMenu"
        class="admin-menu"
        @select="handleMenuSelect"
        background-color="#001529"
        text-color="#FFFFFF"
        active-text-color="#1890FF"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><House /></el-icon>
          <span>{{ $t('admin.menu.dashboard') }}</span>
        </el-menu-item>
        
        <el-sub-menu index="business">
          <template #title>
            <el-icon><Shop /></el-icon>
            <span>{{ $t('admin.menu.business') }}</span>
          </template>
          <el-menu-item index="/admin/stores">
            <span>{{ $t('admin.menu.storeManagement') }}</span>
          </el-menu-item>
          <el-menu-item index="/admin/campaigns">
            <span>{{ $t('admin.menu.activityManagement') }}</span>
          </el-menu-item>
          <el-menu-item index="/admin/redemptions">
            <span>{{ $t('admin.menu.redemptionManagement') }}</span>
          </el-menu-item>
          <el-menu-item index="/admin/posts">
            <span>{{ $t('admin.menu.contentManagement') }}</span>
          </el-menu-item>
          <el-menu-item index="/admin/comments">
            <span>{{ $t('admin.menu.commentManagement') }}</span>
          </el-menu-item>
          
          <!-- 积分商城管理子菜单 -->
          <el-sub-menu index="rewards">
            <template #title>
              <el-icon><Present /></el-icon>
              <span>{{ $t('admin.menu.rewardsManagement') }}</span>
            </template>
            <el-menu-item index="/admin/rewards/items">
              <span>{{ $t('admin.menu.rewardsItems') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/rewards/campaigns">
              <span>{{ $t('admin.menu.rewardsCampaigns') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/rewards/orders">
              <span>{{ $t('admin.menu.rewardsOrders') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/rewards/inventory">
              <span>{{ $t('admin.menu.rewardsInventory') }}</span>
            </el-menu-item>
          </el-sub-menu>
        </el-sub-menu>
        
        <el-sub-menu index="data">
          <template #title>
            <el-icon><DataAnalysis /></el-icon>
            <span>{{ $t('admin.menu.dataCenter') }}</span>
          </template>
          <el-menu-item index="/admin/analytics">
            <span>{{ $t('admin.menu.dataStatistics') }}</span>
          </el-menu-item>
          <el-menu-item index="/admin/users">
            <span>{{ $t('admin.menu.userManagement') }}</span>
          </el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="/admin/my-content" v-if="adminInfo.role === 'content_operator'">
          <el-icon><Document /></el-icon>
          <span>{{ $t('admin.menu.myContent') }}</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/accounts" v-if="adminInfo.role === 'super_admin'">
          <el-icon><User /></el-icon>
          <span>{{ $t('admin.menu.accountManagement') }}</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/settings">
          <el-icon><Setting /></el-icon>
          <span>{{ $t('admin.menu.systemSettings') }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 顶部导航栏 -->
      <el-header height="64px" class="top-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item>{{ $t('admin.dashboard') }}</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $t('admin.overview') }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-space size="large">
            <!-- 语言切换 -->
            <el-dropdown @command="handleLanguageChange" class="language-switcher">
              <el-button type="text" class="header-btn">
                <el-icon class="header-icon"><SwitchButton /></el-icon>
                {{ currentLanguageText }}
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="zh-cn">🇨🇳 中文</el-dropdown-item>
                  <el-dropdown-item command="en-us">🇺🇸 English</el-dropdown-item>
                  <el-dropdown-item command="th-th">🇹🇭 ไทย</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            
            <!-- 通知 -->
            <el-badge :value="notificationCount" :hidden="notificationCount === 0">
              <el-button type="text" class="header-btn">
                <el-icon class="header-icon"><Bell /></el-icon>
              </el-button>
            </el-badge>
            
            <!-- 用户菜单 -->
            <el-dropdown @command="handleUserMenuClick">
              <div class="user-profile">
                <el-avatar :size="32" :src="adminInfo.avatar" class="user-avatar">
                  {{ adminInfo.name?.charAt(0) || 'A' }}
                </el-avatar>
                <span class="user-name">{{ adminInfo.name || adminInfo.email }}</span>
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">{{ $t('admin.userMenu.profile') }}</el-dropdown-item>
                  <el-dropdown-item command="settings">{{ $t('admin.userMenu.settings') }}</el-dropdown-item>
                  <el-dropdown-item divided command="logout">{{ $t('admin.logout') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-space>
        </div>
      </el-header>

      <!-- 主要内容 -->
      <el-main class="dashboard-main">
        <!-- 欢迎区域 -->
        <div class="welcome-section">
          <div class="welcome-content">
            <div class="welcome-text">
              <h2 class="welcome-title">{{ $t('admin.welcomeMessage', { name: adminInfo.name || adminInfo.email }) }}</h2>
              <p class="welcome-subtitle">{{ $t('admin.dashboardSubtitle') }}</p>
              <div class="welcome-stats">
                <span class="last-login">{{ $t('admin.lastLogin') }}：{{ formatDate(adminInfo.last_login) }}</span>
                <span class="current-time">{{ currentDateTime }}</span>
              </div>
            </div>
            <div class="welcome-actions">
              <el-button type="primary" size="large" @click="navigateTo('/admin/campaigns')">
                <el-icon><Plus /></el-icon>
                {{ $t('admin.quickActions.newCampaign') }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 数据统计卡片 -->
        <el-row :gutter="24" class="stats-row">
          <el-col :span="6">
            <el-card class="stat-card revenue-card" shadow="hover">
              <div class="stat-header">
                <div class="stat-icon revenue-icon">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="stat-trend positive">
                  <el-icon><TrendCharts /></el-icon>
                  <span>+12.3%</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-value">¥{{ formatNumber(dashboardStats.totalRevenue) }}</div>
                <div class="stat-label">{{ $t('admin.stats.totalRevenue') }}</div>
                <div class="stat-comparison">{{ $t('admin.stats.vsLastMonth') }}</div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card orders-card" shadow="hover">
              <div class="stat-header">
                <div class="stat-icon orders-icon">
                  <el-icon><ShoppingCart /></el-icon>
                </div>
                <div class="stat-trend positive">
                  <el-icon><Top /></el-icon>
                  <span>+8.7%</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ formatNumber(dashboardStats.totalOrders) }}</div>
                <div class="stat-label">{{ $t('admin.stats.totalOrders') }}</div>
                <div class="stat-comparison">{{ $t('admin.stats.vsLastMonth') }}</div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card users-card" shadow="hover">
              <div class="stat-header">
                <div class="stat-icon users-icon">
                  <el-icon><User /></el-icon>
                </div>
                <div class="stat-trend positive">
                  <el-icon><Top /></el-icon>
                  <span>+15.2%</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ formatNumber(dashboardStats.totalUsers) }}</div>
                <div class="stat-label">{{ $t('admin.stats.totalUsers') }}</div>
                <div class="stat-comparison">{{ $t('admin.stats.vsLastMonth') }}</div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card conversion-card" shadow="hover">
              <div class="stat-header">
                <div class="stat-icon conversion-icon">
                  <el-icon><PieChart /></el-icon>
                </div>
                <div class="stat-trend negative">
                  <el-icon><Bottom /></el-icon>
                  <span>-2.1%</span>
                </div>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ dashboardStats.conversionRate }}%</div>
                <div class="stat-label">{{ $t('admin.stats.conversionRate') }}</div>
                <div class="stat-comparison">{{ $t('admin.stats.vsLastMonth') }}</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 图表区域 -->
        <el-row :gutter="24" class="charts-row">
          <!-- 销售趋势图 -->
          <el-col :span="16">
            <el-card class="chart-card" shadow="never">
              <template #header>
                <div class="chart-header">
                  <h3>{{ $t('admin.charts.salesTrend') }}</h3>
                  <el-radio-group v-model="salesPeriod" size="small">
                    <el-radio-button label="7d">{{ $t('admin.charts.last7Days') }}</el-radio-button>
                    <el-radio-button label="30d">{{ $t('admin.charts.last30Days') }}</el-radio-button>
                    <el-radio-button label="90d">{{ $t('admin.charts.last90Days') }}</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              <div class="chart-container">
                <v-chart :option="salesChartOption" class="chart" />
              </div>
            </el-card>
          </el-col>
          
          <!-- 优惠券分布 -->
          <el-col :span="8">
            <el-card class="chart-card" shadow="never">
              <template #header>
                <h3>{{ $t('admin.charts.couponDistribution') }}</h3>
              </template>
              <div class="chart-container">
                <v-chart :option="couponChartOption" class="chart" />
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 最近活动和快速操作 -->
        <el-row :gutter="24" class="activity-row">
          <!-- 最近活动 -->
          <el-col :span="12">
            <el-card class="activity-card" shadow="never">
              <template #header>
                <div class="activity-header">
                  <h3>{{ $t('admin.recentActivity.title') }}</h3>
                  <el-link type="primary">{{ $t('admin.recentActivity.viewAll') }}</el-link>
                </div>
              </template>
              <el-timeline class="activity-timeline">
                <el-timeline-item
                  v-for="activity in recentActivities"
                  :key="activity.id"
                  :timestamp="activity.time"
                  :type="activity.type"
                >
                  <div class="activity-content">
                    <span class="activity-text">{{ activity.description }}</span>
                    <el-tag v-if="activity.tag" :type="activity.tagType" size="small">{{ activity.tag }}</el-tag>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </el-card>
          </el-col>
          
          <!-- 快速操作 -->
          <el-col :span="12">
            <el-card class="quick-actions-card" shadow="never">
              <template #header>
                <h3>{{ $t('admin.quickActions.title') }}</h3>
              </template>
              <div class="quick-actions-grid">
                <div 
                  v-for="action in quickActions"
                  :key="action.key"
                  class="quick-action-item"
                  @click="handleQuickAction(action.action)"
                >
                  <div class="action-icon" :class="action.iconClass">
                    <el-icon :size="24"><component :is="action.icon" /></el-icon>
                  </div>
                  <div class="action-content">
                    <div class="action-title">{{ action.title }}</div>
                    <div class="action-desc">{{ action.description }}</div>
                  </div>
                  <el-icon class="action-arrow"><ArrowRight /></el-icon>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { 
  ArrowDown, ArrowRight, House, Shop, DataAnalysis, Setting, Bell, Plus,
  Money, ShoppingCart, User, PieChart, TrendCharts, Top, Bottom,
  Promotion, DocumentChecked, Management, SwitchButton, Document, Present
} from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart as EPieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import axios from 'axios'
import { useAdminTimeout } from '@/composables/useAdminTimeout'

use([
  CanvasRenderer,
  LineChart,
  EPieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
])

export default defineComponent({
  name: 'AdminDashboard',
  components: {
    VChart
  },
  setup() {
    const router = useRouter()
    const { t, locale } = useI18n()
    
    // 初始化管理员自动登出功能（3分钟无活动自动登出）
    const { startMonitoring, manualLogout } = useAdminTimeout()
    
    const activeMenu = ref('/admin/dashboard')
    const adminInfo = ref({})
    const currentDateTime = ref('')
    const notificationCount = ref(3)
    const salesPeriod = ref('30d')
    
    const dashboardStats = ref({
      totalRevenue: 234567,
      totalOrders: 1284,
      totalUsers: 8954,
      conversionRate: 3.7,
      totalCoupons: 0,
      totalStores: 0,
      totalRedemptions: 0
    })

    const recentActivities = computed(() => [
      {
        id: 1,
        time: '2025-09-15 10:30',
        type: 'success',
        description: t('admin.activities.newCampaignAdded'),
        tag: t('admin.activities.campaign'),
        tagType: 'success'
      },
      {
        id: 2,
        time: '2025-09-15 09:15',
        type: 'warning',
        description: t('admin.activities.refundRequested'),
        tag: t('admin.activities.refund'),
        tagType: 'warning'
      },
      {
        id: 3,
        time: '2025-09-15 08:45',
        type: 'primary',
        description: t('admin.activities.newStoreAdded'),
        tag: t('admin.activities.store'),
        tagType: 'primary'
      }
    ])

    // 语言切换功能
    const currentLanguage = ref(locale.value)
    const currentLanguageText = computed(() => {
      const languageMap = {
        'zh-cn': '中文',
        'en-us': 'English',
        'th-th': 'ไทย'
      }
      return languageMap[currentLanguage.value] || '中文'
    })

    // 快速操作
    const quickActions = computed(() => [
      {
        key: 'new-campaign',
        title: t('admin.quickActions.newCampaign'),
        description: t('admin.quickActions.newCampaignDesc'),
        icon: Promotion,
        iconClass: 'promotion-icon',
        action: () => navigateTo('/admin/campaigns')
      },
      {
        key: 'add-store',
        title: t('admin.quickActions.addStore'),
        description: t('admin.quickActions.addStoreDesc'),
        icon: Shop,
        iconClass: 'store-icon',
        action: () => navigateTo('/admin/stores')
      },
      {
        key: 'user-analysis',
        title: t('admin.quickActions.userAnalysis'),
        description: t('admin.quickActions.userAnalysisDesc'),
        icon: DataAnalysis,
        iconClass: 'analysis-icon',
        action: () => navigateTo('/admin/analytics')
      },
      {
        key: 'system-settings',
        title: t('admin.quickActions.systemSettings'),
        description: t('admin.quickActions.systemSettingsDesc'),
        icon: Setting,
        iconClass: 'settings-icon',
        action: () => navigateTo('/admin/settings')
      }
    ])

    // 销售趋势图表
    const salesChartOption = computed(() => {
      const months = [
        t('months.jan'), t('months.feb'), t('months.mar'), 
        t('months.apr'), t('months.may'), t('months.jun'),
        t('months.jul'), t('months.aug'), t('months.sep')
      ]
      
      return {
        grid: { top: 20, right: 20, bottom: 40, left: 60 },
        xAxis: {
          type: 'category',
          data: months
        },
        yAxis: {
          type: 'value'
        },
        tooltip: {
          trigger: 'axis'
        },
        series: [
          {
            name: t('admin.charts.salesAmount'),
            type: 'line',
            smooth: true,
            data: [12000, 19000, 15000, 23000, 28000, 35000, 42000, 38000, 45000],
            lineStyle: {
              color: '#1890FF'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [{
                  offset: 0, color: 'rgba(24, 144, 255, 0.3)'
                }, {
                  offset: 1, color: 'rgba(24, 144, 255, 0.05)'
                }]
              }
            }
          }
        ]
      }
    })

    // 优惠券分布图表
    const couponChartOption = computed(() => ({
      tooltip: {
        trigger: 'item'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { value: 1048, name: t('admin.charts.fullReductionCoupon') },
            { value: 735, name: t('admin.charts.discountCoupon') },
            { value: 580, name: t('admin.charts.freeCoupon') },
            { value: 484, name: t('admin.charts.pointsCoupon') }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }))

    // 更新当前时间
    const updateDateTime = () => {
      const now = new Date()
      currentDateTime.value = now.toLocaleString('zh-CN')
    }

    const timeInterval = ref(null)

    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem('admin_token')
        const headers = {
          'Authorization': `Bearer ${token}`
        }
        
        // 加载管理员信息
        const adminData = JSON.parse(localStorage.getItem('admin_user') || '{}')
        adminInfo.value = adminData
        
        // 加载仪表板统计数据
        try {
          const response = await axios.get('/api/admin/analytics', { headers })
          if (response.data.success) {
            dashboardStats.value = { ...dashboardStats.value, ...response.data.stats }
          }
        } catch (error) {
          console.log('Analytics API not implemented yet, using mock data')
        }
      } catch (error) {
        console.error('加载仪表板数据失败:', error)
        if (error.response?.status === 401) {
          handleLogout()
        }
      }
    }

    const setActiveMenu = (path) => {
      activeMenu.value = path
    }

    const handleMenuSelect = (index) => {
      console.log('菜单选择:', index)
      setActiveMenu(index)
      router.push(index)
    }

    const handleLogout = () => {
      // 使用集成的自动登出功能，停止监测并清理认证信息
      manualLogout()
      ElMessage.success(t('admin.logoutSuccess'))
    }

    const handleLanguageChange = (value) => {
      locale.value = value
      currentLanguage.value = value
      localStorage.setItem('language', value)
      ElMessage.success(t('common.languageChanged'))
    }

    const handleUserMenuClick = (command) => {
      switch (command) {
        case 'profile':
          ElMessage.info(t('admin.userMenu.profileClicked'))
          break
        case 'settings':
          navigateTo('/admin/settings')
          break
        case 'logout':
          handleLogout()
          break
      }
    }

    const handleQuickAction = (action) => {
      if (typeof action === 'function') {
        action()
      }
    }

    const navigateTo = (path) => {
      setActiveMenu(path)
      router.push(path)
    }

    const formatDate = (dateString) => {
      if (!dateString) return t('admin.neverLogin')
      return new Date(dateString).toLocaleString('zh-CN')
    }

    const formatNumber = (num) => {
      return new Intl.NumberFormat('zh-CN').format(num)
    }

    onMounted(() => {
      // 检查管理员登录状态
      const token = localStorage.getItem('admin_token')
      if (!token) {
        router.push('/admin/login')
        return
      }
      
      loadDashboardData()
      updateDateTime()
      timeInterval.value = setInterval(updateDateTime, 1000)
    })

    onBeforeUnmount(() => {
      if (timeInterval.value) {
        clearInterval(timeInterval.value)
      }
    })

    return {
      activeMenu,
      adminInfo,
      currentDateTime,
      notificationCount,
      salesPeriod,
      dashboardStats,
      recentActivities,
      currentLanguage,
      currentLanguageText,
      quickActions,
      salesChartOption,
      couponChartOption,
      setActiveMenu,
      handleMenuSelect,
      handleLogout,
      handleLanguageChange,
      handleUserMenuClick,
      handleQuickAction,
      navigateTo,
      formatDate,
      formatNumber,
      // Icons
      ArrowDown,
      ArrowRight,
      House,
      Shop,
      DataAnalysis,
      Setting,
      SwitchButton,
      Bell,
      Plus,
      Money,
      ShoppingCart,
      User,
      PieChart,
      TrendCharts,
      Top,
      Bottom,
      Promotion,
      DocumentChecked,
      Management
    }
  }
})
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
}

/* 侧边栏样式 */
.sidebar {
  background: #001529;
  overflow: hidden;
}

.logo-section {
  padding: 24px 20px;
  text-align: center;
  border-bottom: 1px solid #1f2937;
}

.logo-placeholder {
  width: 40px;
  height: 40px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: bold;
  margin: 0 auto 8px auto;
}

.brand-title {
  color: #ffffff;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.admin-menu {
  border: none;
  height: calc(100vh - 120px);
}

.admin-menu .el-menu-item,
.admin-menu .el-sub-menu__title {
  height: 50px;
  line-height: 50px;
  padding-left: 24px !important;
}

/* 主容器样式 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 */
.top-header {
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  border-bottom: 1px solid #f0f0f0;
}

.header-left .el-breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}

.header-btn {
  color: #595959;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.3s;
}

.header-btn:hover {
  background: #f5f5f5;
  color: #1890ff;
}

.header-icon {
  margin-right: 4px;
}

.user-profile {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.user-profile:hover {
  background: #f5f5f5;
}

.user-avatar {
  margin-right: 8px;
}

.user-name {
  margin-right: 8px;
  font-size: 14px;
  color: #595959;
}

/* 主内容区域 */
.dashboard-main {
  padding: 24px;
  background: #f0f2f5;
  overflow-y: auto;
}

/* 欢迎区域 */
.welcome-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  color: white;
  position: relative;
  overflow: hidden;
}

.welcome-section::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transform: translate(100px, -100px);
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.welcome-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0 0 16px 0;
}

.welcome-stats {
  display: flex;
  gap: 32px;
  font-size: 14px;
  opacity: 0.8;
}

.welcome-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
}

.welcome-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.4);
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  border: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
}

.revenue-card::before { background: linear-gradient(135deg, #667eea, #764ba2); }
.orders-card::before { background: linear-gradient(135deg, #f093fb, #f5576c); }
.users-card::before { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.conversion-card::before { background: linear-gradient(135deg, #43e97b, #38f9d7); }

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.revenue-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
.orders-icon { background: linear-gradient(135deg, #f093fb, #f5576c); }
.users-icon { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.conversion-icon { background: linear-gradient(135deg, #43e97b, #38f9d7); }

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 20px;
}

.stat-trend.positive {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.stat-trend.negative {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.stat-content {
  text-align: left;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #262626;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 4px;
}

.stat-comparison {
  font-size: 12px;
  color: #bfbfbf;
}

/* 图表区域 */
.charts-row {
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 12px;
  border: none;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  color: #262626;
}

.chart-container {
  height: 300px;
}

.chart {
  width: 100%;
  height: 100%;
}

/* 活动区域 */
.activity-row {
  margin-bottom: 24px;
}

.activity-card,
.quick-actions-card {
  border-radius: 12px;
  border: none;
  height: 400px;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-header h3 {
  margin: 0;
  font-size: 16px;
  color: #262626;
}

.activity-timeline {
  margin-top: 16px;
  max-height: 320px;
  overflow-y: auto;
}

.activity-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-text {
  flex: 1;
  font-size: 14px;
  color: #595959;
}

/* 快速操作 */
.quick-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.quick-action-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.quick-action-item:hover {
  border-color: #1890ff;
  background: #f6f9ff;
  transform: translateX(4px);
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: white;
}

.promotion-icon { background: linear-gradient(135deg, #ff6b6b, #ee5a24); }
.store-icon { background: linear-gradient(135deg, #4ecdc4, #44a08d); }
.analysis-icon { background: linear-gradient(135deg, #a8e6cf, #3d8b37); }
.settings-icon { background: linear-gradient(135deg, #ffd93d, #ff6b35); }

.action-content {
  flex: 1;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.action-desc {
  font-size: 12px;
  color: #8c8c8c;
}

.action-arrow {
  color: #bfbfbf;
  transition: all 0.3s;
}

.quick-action-item:hover .action-arrow {
  color: #1890ff;
  transform: translateX(4px);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-row .el-col {
    margin-bottom: 16px;
  }
}

@media (max-width: 768px) {
  .dashboard-main {
    padding: 16px;
  }
  
  .welcome-content {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .welcome-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-value {
    font-size: 24px;
  }
  
  .charts-row .el-col {
    margin-bottom: 16px;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .activity-card,
  .quick-actions-card {
    height: auto;
    min-height: 300px;
  }
}
</style>