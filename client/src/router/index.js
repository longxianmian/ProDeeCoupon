// import Home from '../views/Home.vue' // 已删除，React接管首页
import CouponDetail from '../views/CouponDetail.vue'
import MyCoupons from '../views/MyCoupons.vue'
import Admin from '../views/Admin.vue'
import StaffWorkspace from '../views/StaffWorkspace.vue'
import StaffBinding from '../views/StaffBinding.vue'
import AdminLogin from '../views/AdminLogin.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AdminStores from '../views/AdminStores.vue'

export default [
  // 根路径现在由React接管，Vue不再处理 '/' 路由
  {
    path: '/coupon/:id',
    name: 'CouponDetail',
    component: CouponDetail,
    meta: { title: '优惠券详情' }
  },
  {
    path: '/my-coupons',
    name: 'MyCoupons',
    component: MyCoupons,
    meta: { title: '我的优惠券' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
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
    path: '/admin/campaigns',
    name: 'AdminCampaigns',
    component: () => import('../views/AdminCampaigns.vue'),
    meta: { title: '活动管理', requiresAuth: true }
  },
  {
    path: '/admin/redemptions',
    name: 'AdminRedemptions',
    component: () => import('../views/AdminRedemptions.vue'),
    meta: { title: '核销管理', requiresAuth: true }
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
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('../views/Privacy.vue'),
    meta: { title: '隐私政策' }
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('../views/Terms.vue'),
    meta: { title: '使用条款' }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    redirect: '/admin/stores',
    meta: { title: '用户管理' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]