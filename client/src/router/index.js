import Home from '../views/Home.vue'
import Search from '../views/Search.vue'
import Settings from '../views/Settings.vue'
import Messages from '../views/Messages.vue'
import CouponDetail from '../views/CouponDetail.vue'
import RewardsMall from '../views/RewardsMall.vue'
import RewardDetail from '../views/RewardDetail.vue'
import UserCouponDetail from '../views/UserCouponDetail.vue'
import StaffWorkspace from '../views/StaffWorkspace.vue'
import StaffBinding from '../views/StaffBinding.vue'
import AdminLogin from '../views/AdminLogin.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AdminStores from '../views/AdminStores.vue'
import AdminPosts from '../views/AdminPosts.vue'
import AdminCampaigns from '../views/AdminCampaigns.vue'
import AdminRedemptions from '../views/AdminRedemptions.vue'
import AdminComments from '../views/admin/CommentManagement.vue'
import Help from '../views/Help.vue'
import StaffStore from '../views/StaffStore.vue'
import StaffActivities from '../views/StaffActivities.vue'
import StaffMy from '../views/StaffMy.vue'
import Entry from '../views/Entry.vue'

export default [
  // 分享页面入口路由
  { path: '/entry', name: 'Entry', component: Entry, meta: { title: 'Entry' } },
  // 用户端首页路由
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { title: 'ProDee优惠券系统' }
  },
  {
    path: '/search',
    name: 'Search',
    component: Search,
    meta: { title: '搜索' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: '设置' }
  },
  {
    path: '/messages',
    name: 'Messages',
    component: Messages,
    meta: { title: '我的消息' }
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('../views/Terms.vue'),
    meta: { title: '用户协议' }
  },
  {
    path: '/help',
    name: 'Help',
    component: Help,
    meta: { title: '帮助中心' }
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('../views/Privacy.vue'),
    meta: { title: '隐私政策' }
  },
  {
    path: '/data-deletion',
    name: 'DataDeletion',
    component: () => import('../views/DataDeletion.vue'),
    meta: { title: '数据删除' }
  },
  {
    path: '/coupon/:id',
    name: 'CouponDetail',
    component: CouponDetail,
    meta: { title: '优惠券详情' }
  },
  {
    path: '/oa-activity',
    name: 'OaActivity',
    component: () => import('../views/OaActivity.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/my-coupon/:userCouponId',
    name: 'UserCouponDetail',
    component: UserCouponDetail,
    meta: { title: '优惠券核销' }
  },
  {
    path: '/my',
    redirect: '/',
    meta: { title: '个人中心' }
  },
  {
    path: '/login-success',
    name: 'LoginSuccess',
    component: () => import('../views/LoginSuccess.vue'),
    meta: { title: 'เข้าสู่ระบบสำเร็จ', requiresAuth: false }
  },
  {
    path: '/rewards',
    name: 'RewardsMall',
    component: RewardsMall,
    meta: { title: '积分商城' }
  },
  {
    path: '/rewards/:id',
    name: 'RewardDetail',
    component: RewardDetail,
    meta: { title: '礼品详情' }
  },
  {
    path: '/rewards/history',
    name: 'RewardsHistory',
    component: () => import('../views/RewardsHistory.vue'),
    meta: { title: '兑换记录' }
  },
  {
    path: '/payment/result',
    name: 'PaymentResult',
    component: () => import('../views/PaymentResult.vue'),
    meta: { title: '支付结果' }
  },
  {
    path: '/admin',
    name: 'Admin',
    redirect: '/admin/dashboard',
    meta: { title: '管理后台' }
  },
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLogin,
    meta: { title: '管理员登录' }
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { title: '管理员仪表板', requiresAuth: true }
  },
  {
    path: '/admin/stores',
    name: 'AdminStores',
    component: AdminStores,
    meta: { title: '门店管理', requiresAuth: true }
  },
  {
    path: '/admin/analytics',
    name: 'AdminAnalytics',
    component: () => import('../views/admin/Analytics.vue'),
    meta: { title: '数据统计', requiresAuth: true }
  },
  {
    path: '/admin/campaigns',
    name: 'AdminCampaigns',
    component: AdminCampaigns,
    meta: { title: '活动管理', requiresAuth: true }
  },
  {
    path: '/admin/redemptions',
    name: 'AdminRedemptions',
    component: AdminRedemptions,
    meta: { title: '核销管理', requiresAuth: true }
  },
  {
    path: '/admin/posts',
    name: 'AdminPosts',
    component: AdminPosts,
    meta: { title: '内容管理', requiresAuth: true }
  },
  {
    path: '/admin/comments',
    name: 'AdminComments',
    component: AdminComments,
    meta: { title: '评论管理', requiresAuth: true }
  },
  {
    path: '/admin/accounts',
    name: 'AdminAccounts',
    component: () => import('../views/admin/AccountManagement.vue'),
    meta: { title: '账号管理', requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/admin/my-content',
    name: 'AdminMyContent',
    component: () => import('../views/admin/MyContent.vue'),
    meta: { title: '我的内容', requiresAuth: true, requiresContentOperator: true }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('../views/admin/UserManagement.vue'),
    meta: { title: '用户管理', requiresAuth: true }
  },
  {
    path: '/admin/settings',
    name: 'AdminSettings',
    component: () => import('../views/admin/SystemSettings.vue'),
    meta: { title: '系统设置', requiresAuth: true }
  },
  {
    path: '/admin/rewards/items',
    name: 'AdminRewardsItems',
    component: () => import('../views/admin/rewards/RewardsItems.vue'),
    meta: { title: '商品管理', requiresAuth: true }
  },
  {
    path: '/admin/rewards/campaigns',
    name: 'AdminRewardsCampaigns',
    component: () => import('../views/admin/rewards/RewardsCampaigns.vue'),
    meta: { title: '活动配置', requiresAuth: true }
  },
  {
    path: '/admin/rewards/orders',
    name: 'AdminRewardsOrders',
    component: () => import('../views/admin/rewards/RewardsOrders.vue'),
    meta: { title: '兑换订单', requiresAuth: true }
  },
  {
    path: '/admin/rewards/inventory',
    name: 'AdminRewardsInventory',
    component: () => import('../views/admin/rewards/RewardsInventory.vue'),
    meta: { title: '库存管理', requiresAuth: true }
  },
  {
    path: '/staff',
    name: 'StaffWorkspace',
    component: StaffWorkspace,
    meta: { title: '店员工作台' }
  },
  {
    path: '/staff-binding',
    name: 'StaffBinding',
    component: StaffBinding,
    meta: { title: '员工绑定' }
  },
  // 店员专用路由
  {
    path: '/staff/activities',
    name: 'StaffActivities',
    component: StaffActivities,
    meta: { title: '门店活动', requiresStaff: true }
  },
  {
    path: '/staff/store',
    name: 'StaffStore',
    component: StaffStore,
    meta: { title: '门店数据', requiresStaff: true }
  },
  {
    path: '/staff/my',
    name: 'StaffMy',
    component: StaffMy,
    meta: { title: '我的核销', requiresStaff: true }
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('../views/PostDetail.vue'),
    meta: { title: '内容详情' }
  },
  {
    path: '/feed/video',
    name: 'VideoFeed',
    component: () => import('../views/VideoFeed.vue'),
    meta: { title: '视频沉浸流' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]