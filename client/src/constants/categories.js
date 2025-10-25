// 统一"行业类目"字典（按泰国热度，双字名；slug 固定给后端/后台使用）
export const CATEGORIES = [
  { slug:'beauty', zh:'美妆', en:'Beauty', th:'ความงาม', icon:'💄', hot:true },
  { slug:'fashion', zh:'时尚', en:'Fashion', th:'แฟชั่น', icon:'👗', hot:true },
  { slug:'food', zh:'美食', en:'Food', th:'อาหาร', icon:'🍣', hot:true },
  { slug:'3c', zh:'数码', en:'3C', th:'มือถือ', icon:'📱', hot:true },
  { slug:'travel', zh:'旅行', en:'Travel', th:'ท่องเที่ยว', icon:'✈️', hot:true },
  { slug:'health', zh:'健康', en:'Health', th:'สุขภาพ', icon:'🩺', hot:true },
  { slug:'grocery', zh:'生鲜', en:'Groceries', th:'ซูเปอร์', icon:'🛒', hot:true },
  { slug:'gaming', zh:'游戏', en:'Gaming', th:'เกม', icon:'🎮', hot:true },
  { slug:'entertainment', zh:'娱乐', en:'Entertainment', th:'บันเทิง', icon:'🎬' },
  { slug:'pets', zh:'宠物', en:'Pets', th:'สัตว์เลี้ยง', icon:'🐶' },
  { slug:'mom_kids', zh:'母婴', en:'Mom & Kids', th:'แม่และเด็ก', icon:'👶' },
  { slug:'home', zh:'家居', en:'Home', th:'ของใช้ในบ้าน', icon:'🏠' },
  { slug:'auto', zh:'车品', en:'Auto', th:'ยานยนต์', icon:'🚗' },
  { slug:'finance', zh:'金融', en:'Finance', th:'การเงิน', icon:'💰' },
  { slug:'education', zh:'教育', en:'Education', th:'การศึกษา', icon:'📚' }
]

export function labelFor(slug, locale='zh-cn'){
  const c = CATEGORIES.find(x=>x.slug===slug)
  if(!c) return slug
  if(locale.includes('zh')) return c.zh
  if(locale.includes('th')) return c.th
  return c.en
}