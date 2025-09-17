import React, { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";

// ==================== i18n ====================
const dict = {
  zh: {
    home: "首页",
    hot: "热门", 
    message: "消息",
    my: "我的",
    cat_recommend: "推荐",
    cat_3c: "3C电子",
    cat_fashion: "穿搭",
    cat_food: "美食",
    cat_beauty: "美妆",
    cat_nails: "美甲",
    cat_mom: "母婴",
    menu: "功能菜单",
    lang: "语言切换",
    terms: "使用协议",
    privacy: "隐私政策",
    settings: "设置",
    // 新增的翻译
    lineLogin: "LINE登录",
    loading: "加载中...",
    noCoupons: "暂无优惠券",
    remaining: "剩余{count}",
    off: "折",
    currency: "฿",
    noMessages: "暂无消息",
    messagesTitle: "消息中心"
  },
  en: {
    home: "Home",
    hot: "Hot", 
    message: "Messages",
    my: "My",
    cat_recommend: "Recommend",
    cat_3c: "Electronics",
    cat_fashion: "Fashion",
    cat_food: "Food",
    cat_beauty: "Beauty",
    cat_nails: "Nails",
    cat_mom: "Baby & Mom",
    menu: "Menu",
    lang: "Language",
    terms: "Terms",
    privacy: "Privacy",
    settings: "Settings",
    // 新增的翻译
    lineLogin: "LINE Login",
    loading: "Loading...",
    noCoupons: "No coupons available",
    remaining: "{count} left",
    off: "OFF",
    currency: "฿",
    noMessages: "No messages",
    messagesTitle: "Message Center"
  },
  th: {
    home: "หน้าแรก",
    hot: "ยอดนิยม", 
    message: "ข้อความ",
    my: "ของฉัน",
    cat_recommend: "แนะนำ",
    cat_3c: "อิเล็กทรอนิกส์",
    cat_fashion: "แฟชั่น",
    cat_food: "อาหาร",
    cat_beauty: "ความงาม",
    cat_nails: "เล็บ",
    cat_mom: "แม่และเด็ก",
    menu: "เมนู",
    lang: "ภาษา",
    terms: "ข้อกำหนด",
    privacy: "นโยบาย",
    settings: "การตั้งค่า",
    // 新增的翻译
    lineLogin: "เข้าสู่ระบบด้วย LINE",
    loading: "กำลังโหลด...",
    noCoupons: "ไม่มีคูปอง",
    remaining: "เหลือ {count}",
    off: "ลด",
    currency: "฿",
    noMessages: "ไม่มีข้อความ",
    messagesTitle: "ศูนย์ข้อความ"
  }
};

function useLang() {
  const [lang, setLang] = useState(() => {
    // 从 localStorage读取语言设置，与Vue应用保持同步
    const savedLang = localStorage.getItem('user-language') || 'zh';
    return savedLang.includes('en') ? 'en' : savedLang.includes('th') ? 'th' : 'zh';
  });
  
  const t = useMemo(() => dict[lang] || dict.zh, [lang]);
  
  const switchLanguage = (newLang: string) => {
    setLang(newLang);
    // 保存到localStorage，与Vue应用保持同步
    const vueFormat = newLang === 'en' ? 'en-US' : newLang === 'th' ? 'th-TH' : 'zh-CN';
    localStorage.setItem('user-language', vueFormat);
    
    // 可以通过事件通知Vue应用
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: vueFormat } }));
  };
  
  return { lang, setLang, t, switchLanguage };
}

// ==================== 数据类型定义 ====================
interface MediaFile {
  type: 'image' | 'video';
  url: string;
  filename: string;
  originalName?: string;
  size?: number;
  mimetype?: string;
}

interface Coupon {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  media_files?: MediaFile[]; // 新增：多媒体文件数组
  original_price?: string | null;
  discount_price?: string | null;
  quantity: number;
  claimed_count: number;
  redeemed_count: number;
  valid_from: string;
  valid_to: string;
  status: string;
  created_at: string;
  updated_at: string;
  // 新券类型字段
  coupon_type?: string;
  price_final?: string | null;
  face_value?: string | null;
  amount_off?: string | null;
  min_spend?: string | null;
  discount_percent?: string | null;
  cap_amount?: string | null;
  currency?: string;
  // 价格摘要字段
  price_summary?: string;
  stores: any[];
}

// ==================== 新增类型定义 ====================
// 用户消息数据类型，用于消息中心
interface UserMessage {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

// ==================== API 集成 ====================
const api = {
  // 获取用户token
  getUserToken: () => localStorage.getItem('user_token'),
  
  // 设置用户token  
  setUserToken: (token: string) => localStorage.setItem('user_token', token),
  
  // 获取当前用户信息（统一使用Token认证）
  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('user_token');
      if (!token) {
        return null;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      } else if (response.status === 401) {
        // Token过期，清除本地存储
        localStorage.removeItem('user_token');
        console.log('🔑 用户Token已过期，已清除');
        return null;
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
    return null;
  },
  
  // LINE登录（直接重定向到后端API）
  lineLogin: () => {
    window.location.href = '/api/auth/line';
  },

  // 获取优惠券列表（统一使用Token认证，但优惠券列表可以匿名访问）
  getCoupons: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '20',
        status: 'active',
        ...params
      });
      
      // 优惠券列表不需要认证，但如果有token也带上
      const token = localStorage.getItem('user_token');
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/coupons?${queryParams}`, {
        headers: headers
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.data : null;
      }
    } catch (error) {
      console.error('获取优惠券列表失败:', error);
    }
    return null;
  },

  // ==================== 新增：获取用户消息 ====================
  // 可以对接后端 /api/notifications (返回 { success, data })
  getNotifications: async () => {
    try {
      const token = localStorage.getItem('user_token');
      if (!token) {
        console.log('未登录，无法获取通知');
        return [];
      }

      const response = await fetch('/api/auth/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data && data.success ? data.data.notifications || [] : [];
      } else if (response.status === 401) {
        // Token过期，清除本地存储
        localStorage.removeItem('user_token');
        console.log('🔑 获取通知失败：Token已过期');
        return [];
      }
    } catch (error) {
      console.error('获取消息列表失败:', error);
    }
    return [];
  }
};

// ==================== UI 组件 ====================
function Hamburger({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="menu" data-testid="hamburger" onClick={onClick} className="w-6 h-6 grid place-content-center rounded-md active:scale-95">
      <span className="block w-5 h-[2px] bg-black rounded-sm mb-[3px]" />
      <span className="block w-5 h-[2px] bg-black rounded-sm mb-[3px]" />
      <span className="block w-5 h-[2px] bg-black rounded-sm" />
    </button>
  );
}

function SideMenu({ open, onClose, t, onLogin, lang, onLangChange }: { open: boolean; onClose: () => void; t: any; onLogin: () => void; lang: string; onLangChange: (lang: string) => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 bg-black bg-opacity-40" onClick={onClose}>
      <div className="absolute left-0 top-0 w-2/3 max-w-[250px] h-full bg-white shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{t.menu}</h2>
        <div className="mb-4">
          <button 
            onClick={onLogin}
            className="w-full text-left px-3 py-2 bg-orange-500 text-white rounded-md text-sm"
          >
            {t.lineLogin}
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          <li className="font-semibold text-gray-700">{t.lang}</li>
          <li><button className={`w-full text-left ${lang === 'zh' ? 'text-orange-500 font-semibold' : ''}`} onClick={() => onLangChange('zh')}>中文</button></li>
          <li><button className={`w-full text-left ${lang === 'en' ? 'text-orange-500 font-semibold' : ''}`} onClick={() => onLangChange('en')}>English</button></li>
          <li><button className={`w-full text-left ${lang === 'th' ? 'text-orange-500 font-semibold' : ''}`} onClick={() => onLangChange('th')}>ไทย</button></li>
        </ul>
        <hr className="my-3" />
        <ul className="space-y-2 text-sm">
          <li><button className="w-full text-left text-gray-700" onClick={() => window.location.href = '/terms'}>{t.terms}</button></li>
          <li><button className="w-full text-left text-gray-700" onClick={() => window.location.href = '/privacy'}>{t.privacy}</button></li>
          <li><button className="w-full text-left text-gray-700">{t.settings}</button></li>
        </ul>
      </div>
    </div>
  );
}

function TopNav({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b">
      <div className="flex items-center justify-between px-3 py-2">
        <Hamburger onClick={onMenu} />
        <div className="flex-1 flex justify-center">
          <div className="text-lg font-bold text-orange-600">ProDee</div>
        </div>
        <button className="px-2">🔍</button>
      </div>
    </header>
  );
}

function CategoryBar({ t, value, onChange }: { t: any; value: string; onChange: (k: string) => void }) {
  const items = [
    { key: "recommend", label: t.cat_recommend },
    { key: "3c", label: t.cat_3c },
    { key: "fashion", label: t.cat_fashion },
    { key: "food", label: t.cat_food },
    { key: "beauty", label: t.cat_beauty },
    { key: "nails", label: t.cat_nails },
    { key: "mom", label: t.cat_mom }
  ];
  return (
    <div className="px-2 pt-2">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {items.map((c) => (
          <button
            key={c.key}
            onClick={() => onChange(c.key)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs ${value === c.key ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CouponCard({ coupon, onClick, t }: { coupon: Coupon; onClick?: () => void; t: any }) {
  const remaining = coupon.quantity - coupon.claimed_count;
  
  // 计算折扣百分比 - 使用安全的计算方式
  let discountPercent = 0;
  let showDiscount = false;
  
  if (coupon.original_price && coupon.discount_price && 
      parseFloat(coupon.original_price) > 0 && parseFloat(coupon.discount_price) > 0) {
    discountPercent = Math.round((1 - parseFloat(coupon.discount_price) / parseFloat(coupon.original_price)) * 100);
    showDiscount = discountPercent > 0;
  } else if (coupon.coupon_type === 'percentage_discount' && coupon.discount_percent) {
    discountPercent = Math.round((100 - parseFloat(coupon.discount_percent)) / 10 * 10);
    showDiscount = discountPercent > 0;
  }
  
  // 显示价格信息 - 直接使用后端返回的 price_summary
  const getPriceDisplay = () => {
    // 优先使用后端返回的价格摘要，已经是正确的泰铢格式
    if (coupon.price_summary && coupon.price_summary !== '价格待定') {
      return coupon.price_summary;
    }
    
    // 备选方案：使用原始价格字段
    if (coupon.original_price && coupon.discount_price) {
      return `฿${coupon.discount_price}`;
    }
    
    // 对于其他券类型，显示相应的价格信息
    if (coupon.face_value) {
      return `฿${coupon.face_value}`;
    }
    
    return '价格待定';
  };

  // 获取主要显示图片 - 仿照详情页逻辑
  const getMainImage = () => {
    // 首先检查 image_url 字段
    if (coupon.image_url) {
      return coupon.image_url;
    }
    
    // 然后检查 media_files 中的第一个图片文件
    if (coupon.media_files && coupon.media_files.length > 0) {
      const imageFile = coupon.media_files.find(file => file.type === 'image');
      if (imageFile && imageFile.url) {
        return imageFile.url;
      }
    }
    
    // 如果都没有，返回占位图
    return 'https://via.placeholder.com/300x200?text=Coupon';
  };
  
  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden cursor-pointer" onClick={onClick}>
      <div className="relative" style={{ aspectRatio: "1 / 1.2" }}>
        <img 
          className="w-full h-full object-cover" 
          src={getMainImage()} 
          alt={coupon.title} 
        />
        {showDiscount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            {discountPercent}% {t.off}
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="text-sm font-medium line-clamp-1">{coupon.title}</div>
        <div className="flex justify-between items-center mt-1">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-red-500 font-bold">{getPriceDisplay()}</span>
            {coupon.original_price && coupon.discount_price && coupon.original_price !== coupon.discount_price && (
              <span className="text-xs text-gray-400 line-through">฿{coupon.original_price}</span>
            )}
          </div>
          <span className="text-xs text-gray-500">{t.remaining.replace('{count}', remaining.toString())}</span>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ t, active, onNav }: { t: any; active: string; onNav: (k: string) => void }) {
  const items = [
    { key: "home", label: t.home, icon: "🏠" },
    { key: "hot", label: t.hot, icon: "🔥" },
    { key: "message", label: t.message, icon: "📋" },
    { key: "my", label: t.my, icon: "👤" }
  ];
  
  return (
    <nav className="fixed left-1/2 -translate-x-1/2 bottom-0 w-[390px] max-w-full bg-white border-t shadow-md">
      <div className="mx-auto grid grid-cols-4 text-xs">
        {items.map((it) => (
          <button key={it.key} className={`py-2 flex flex-col items-center ${active === it.key ? "text-orange-500" : "text-gray-500"}`} onClick={() => onNav(it.key)}>
            <div className="text-base">{it.icon}</div>
            <div>{it.label}</div>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ==================== 新增：消息中心组件 ====================
// 显示用户消息列表，并提供返回按钮
function MessageCenter({ messages, t, onBack }: { messages: UserMessage[]; t: any; onBack: () => void }) {
  return (
    <div className="p-4">
      <div className="flex justify-between items-center pb-4">
        <h2 className="text-lg font-medium">{t.messagesTitle}</h2>
        <button onClick={onBack} className="text-blue-500">{t.home}</button>
      </div>
      {messages.length === 0 ? (
        <div className="text-gray-500 text-center py-8">{t.noMessages}</div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="p-3 bg-gray-100 rounded">
              <div className="font-medium">{msg.title}</div>
              <div className="text-sm text-gray-600 whitespace-pre-line">{msg.content}</div>
              <div className="text-xs text-gray-400 mt-1">{new Date(msg.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 主页面 ====================
export default function App() {
  const { t, lang, switchLanguage } = useLang();
  const [category, setCategory] = useState("recommend");
  const [active, setActive] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==================== 新增状态：消息相关 ====================
  const [messages, setMessages] = useState([]);
  const [showMessages, setShowMessages] = useState(false);

  // 页面加载时检查用户登录状态和处理登录回调
  useEffect(() => {
    // 检查是否是从LINE登录回调返回
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      // 如果URL中有token，存储并清理URL
      api.setUserToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    api.getCurrentUser().then(setUser);
    
    // 获取优惠券列表
    const fetchCoupons = async () => {
      setLoading(true);
      const result = await api.getCoupons();
      if (result?.coupons) {
        setCoupons(result.coupons);
      }
      setLoading(false);
    };
    
    fetchCoupons();
  }, []);

  useEffect(() => {
    console.assert(document.querySelector('header'), 'header should render');
    console.assert(document.querySelectorAll('button').length > 0, 'buttons present');
    console.assert(document.querySelector('nav'), 'bottom nav present');
  }, [t]);

  const handleCouponClick = (couponId: number) => {
    // 点击优惠券卡片，跳转到优惠券详情页（使用现有Vue路由）
    window.location.href = `/coupon/${couponId}`;
  };

  // ==================== 新增：处理底部导航点击 ====================
  const handleNavigation = async (key: string) => {
    setActive(key);
    
    if (key === 'home') {
      // 避免不必要的页面刷新，直接重置状态
      setShowMessages(false);
      setActive('home');
      // 重新加载优惠券数据
      const freshCoupons = await api.getCoupons();
      if (freshCoupons && freshCoupons.coupons) {
        setCoupons(freshCoupons.coupons);
      }
    } else if (key === 'hot') {
      // 按热度排序优惠券：领取数 + 核销数
      const sorted = [...coupons].sort((a: any, b: any) => {
        const countA = (a.claimed_count || 0) + (a.redeemed_count || 0);
        const countB = (b.claimed_count || 0) + (b.redeemed_count || 0);
        return countB - countA;
      });
      setCoupons(sorted);
      setShowMessages(false);
    } else if (key === 'message') {
      setLoading(true);
      const list = await api.getNotifications();
      setMessages(list);
      setShowMessages(true);
      setLoading(false);
    } else if (key === 'my') {
      // 检查用户是否已登录
      const token = localStorage.getItem('user_token');
      if (!token) {
        // 未登录，执行LINE登录
        console.log('🔑 用户未登录，启动LINE登录流程');
        api.lineLogin();
      } else {
        // 已登录，跳转到我的优惠券页面
        window.location.href = '/my-coupons';
      }
    } else {
      // 其他情况，恢复默认视图
      setShowMessages(false);
    }
  };

  return (
    <div className="flex justify-center bg-gray-50 min-h-screen">
      <div className="relative w-full max-w-[390px] bg-white min-h-screen pb-[70px] shadow-xl">
        <TopNav onMenu={() => setMenuOpen(true)} />
        <SideMenu 
          open={menuOpen} 
          onClose={() => setMenuOpen(false)} 
          t={t}
          lang={lang}
          onLangChange={switchLanguage}
          onLogin={api.lineLogin}
        />
        <CategoryBar t={t} value={category} onChange={setCategory} />
        <div className="mt-2 px-2">
          {/* 根据是否显示消息中心决定渲染内容 */}
          {showMessages ? (
            <MessageCenter messages={messages} t={t} onBack={() => setShowMessages(false)} />
          ) : loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500">{t.loading}</div>
            </div>
          ) : coupons.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {coupons.map((coupon) => (
                <CouponCard
                  coupon={coupon}
                  t={t}
                  onClick={() => handleCouponClick(coupon.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-500">{t.noCoupons}</div>
            </div>
          )}
        </div>
        {/* 使用自定义 handleNavigation 代替 setActive */}
        <BottomNav t={t} active={active} onNav={handleNavigation} />
      </div>
    </div>
  );
}