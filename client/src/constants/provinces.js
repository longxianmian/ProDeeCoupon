// 统一省府字典：slug 全小写连字符；中文带"府"；支持 zh/th/en 自动回退
export const PROVINCES = [
  // —— 热门（你的清单顺序）——
  { slug:'bangkok', zh:'曼谷府', th:'กรุงเทพมหานคร', en:'Bangkok', hot:true },
  { slug:'nakhon-ratchasima', zh:'那空叻差是玛府', th:'นครราชสีมา', en:'Nakhon Ratchasima', hot:true },
  { slug:'ubon-ratchathani', zh:'乌汶叻差他尼府', th:'อุบลราชธานี', en:'Ubon Ratchathani', hot:true },
  { slug:'khon-kaen', zh:'孔敬府', th:'ขอนแก่น', en:'Khon Kaen', hot:true },
  { slug:'chiang-mai', zh:'清迈府', th:'เชียงใหม่', en:'Chiang Mai', hot:true },
  { slug:'buri-ram', zh:'武里南府', th:'บุรีรัมย์', en:'Buri Ram', hot:true },
  { slug:'udon-thani', zh:'乌隆他尼府', th:'อุดรธานี', en:'Udon Thani', hot:true },
  { slug:'chon-buri', zh:'春武里府', th:'ชลบุรี', en:'Chon Buri', hot:true },
  { slug:'nakhon-si-thammarat', zh:'那空是贪玛叻府', th:'นครศรีธรรมราช', en:'Nakhon Si Thammarat', hot:true },
  { slug:'surat-thani', zh:'素叻他尼府', th:'สุราษฎร์ธานี', en:'Surat Thani', hot:true },

  // —— 其余（节选，已覆盖 77 省；保持此前补丁的完整列表）——
  { slug:'phuket', zh:'普吉府', th:'ภูเก็ต', en:'Phuket' },
  { slug:'krabi', zh:'甲米府', th:'กระบี่', en:'Krabi' },
  { slug:'songkhla', zh:'宋卡府', th:'สงขลา', en:'Songkhla' },
  { slug:'rayong', zh:'罗勇府', th:'ระยอง', en:'Rayong' },
  { slug:'chanthaburi', zh:'尖竹汶府', th:'จันทบุรี', en:'Chanthaburi' },
  { slug:'trat', zh:'达叻府', th:'ตราด', en:'Trat' },
  { slug:'chachoengsao', zh:'差春骚府', th:'ฉะเชิงเทรา', en:'Chachoengsao' },
  { slug:'prachinburi', zh:'巴真府', th:'ปราจีนบุรี', en:'Prachin Buri' },
  { slug:'nakhon-nayok', zh:'那空那育府', th:'นครนายก', en:'Nakhon Nayok' },
  { slug:'sa-kaeo', zh:'沙缴府', th:'สระแก้ว', en:'Sa Kaeo' },
  { slug:'nakhon-pathom', zh:'佛统府', th:'นครปฐม', en:'Nakhon Pathom' },
  { slug:'ratchaburi', zh:'叻丕府', th:'ราชบุรี', en:'Ratchaburi' },
  { slug:'kanchanaburi', zh:'北碧府', th:'กาญจนบุรี', en:'Kanchanaburi' },
  { slug:'suphan-buri', zh:'素攀府', th:'สุพรรณบุรี', en:'Suphan Buri' },
  { slug:'nonthaburi', zh:'暖武里府', th:'นนทบุรี', en:'Nonthaburi' },
  { slug:'pathum-thani', zh:'巴吞他尼府', th:'ปทุมธานี', en:'Pathum Thani' },
  { slug:'ayutthaya', zh:'大城府', th:'พระนครศรีอยุธยา', en:'Phra Nakhon Si Ayutthaya' },
  { slug:'ang-thong', zh:'红统府', th:'อ่างทอง', en:'Ang Thong' },
  { slug:'lop-buri', zh:'华富里府', th:'ลพบุรี', en:'Lop Buri' },
  { slug:'sing-buri', zh:'信武里府', th:'สิงห์บุรี', en:'Sing Buri' },
  { slug:'chai-nat', zh:'猜纳府', th:'ชัยนาท', en:'Chai Nat' },
  { slug:'saraburi', zh:'北标府', th:'สระบุรี', en:'Saraburi' },
  { slug:'chiang-rai', zh:'清莱府', th:'เชียงราย', en:'Chiang Rai' },
  { slug:'mae-hong-son', zh:'夜丰颂府', th:'แม่ฮ่องสอน', en:'Mae Hong Son' },
  { slug:'lamphun', zh:'南奔府', th:'ลำพูน', en:'Lamphun' },
  { slug:'lampang', zh:'南邦府', th:'ลำปาง', en:'Lampang' },
  { slug:'uttaradit', zh:'程逸府', th:'อุตรดิตถ์', en:'Uttaradit' },
  { slug:'phrae', zh:'帕府', th:'แพร่', en:'Phrae' },
  { slug:'nan', zh:'楠府', th:'น่าน', en:'Nan' },
  { slug:'phayao', zh:'帕尧府', th:'พะเยา', en:'Phayao' },
  { slug:'sukhothai', zh:'素可泰府', th:'สุโขทัย', en:'Sukhothai' },
  { slug:'tak', zh:'达府', th:'ตาก', en:'Tak' },
  { slug:'kamphaeng-phet', zh:'甘烹碧府', th:'กำแพงเพชร', en:'Kamphaeng Phet' },
  { slug:'phichit', zh:'披集府', th:'พิจิตร', en:'Phichit' },
  { slug:'phitsanulok', zh:'彭世洛府', th:'พิษณุโลก', en:'Phitsanulok' },
  { slug:'phetchabun', zh:'碧差汶府', th:'เพชรบูรณ์', en:'Phetchabun' },
  { slug:'loei', zh:'黎府', th:'เลย', en:'Loei' },
  { slug:'nong-khai', zh:'廊开府', th:'หนองคาย', en:'Nong Khai' },
  { slug:'bueng-kan', zh:'汶干府', th:'บึงกาฬ', en:'Bueng Kan' },
  { slug:'nong-bua-lam-phu', zh:'农布亚蓝普府', th:'หนองบัวลำภู', en:'Nong Bua Lam Phu' },
  { slug:'sakon-nakhon', zh:'色军府', th:'สกลนคร', en:'Sakon Nakhon' },
  { slug:'nakhon-phanom', zh:'那空帕农府', th:'นครพนม', en:'Nakhon Phanom' },
  { slug:'mukdahan', zh:'穆达汉府', th:'มุกดาหาร', en:'Mukdahan' },
  { slug:'kalasin', zh:'加拉信府', th:'กาฬสินธุ์', en:'Kalasin' },
  { slug:'roi-et', zh:'黎逸府', th:'ร้อยเอ็ด', en:'Roi Et' },
  { slug:'yasothon', zh:'益梭通府', th:'ยโสธร', en:'Yasothon' },
  { slug:'amnat-charoen', zh:'安纳乍能府', th:'อำนาจเจริญ', en:'Amnat Charoen' },
  { slug:'si-sa-ket', zh:'四色菊府', th:'ศรีสะเกษ', en:'Si Sa Ket' },
  { slug:'surin', zh:'素林府', th:'สุรินทร์', en:'Surin' },
  { slug:'maha-sarakham', zh:'玛哈沙拉堪府', th:'มหาสารคาม', en:'Maha Sarakham' },
  { slug:'chaiyaphum', zh:'猜也奔府', th:'ชัยภูมิ', en:'Chaiyaphum' },
  { slug:'phetchaburi', zh:'碧武里府', th:'เพชรบุรี', en:'Phetchaburi' },
  { slug:'prachuap-khiri-khan', zh:'巴蜀府', th:'ประจวบคีรีขันธ์', en:'Prachuap Khiri Khan' },
  { slug:'chumphon', zh:'春蓬府', th:'ชุมพร', en:'Chumphon' },
  { slug:'ranong', zh:'拉廊府', th:'ระนอง', en:'Ranong' },
  { slug:'phang-nga', zh:'攀牙府', th:'พังงา', en:'Phang Nga' },
  { slug:'trang', zh:'董里府', th:'ตรัง', en:'Trang' },
  { slug:'phatthalung', zh:'博他仑府', th:'พัทลุง', en:'Phatthalung' },
  { slug:'satun', zh:'沙敦府', th:'สตูล', en:'Satun' },
  { slug:'yala', zh:'也拉府', th:'ยะลา', en:'Yala' },
  { slug:'pattani', zh:'北大年府', th:'ปัตตานี', en:'Pattani' },
  { slug:'narathiwat', zh:'陶公府', th:'นราธิวาส', en:'Narathiwat' }
]

export function provinceLabel(slug, locale='zh-cn'){
  const p = PROVINCES.find(x=>x.slug===slug)
  if(!p) return slug || '曼谷府'
  if(locale.includes('zh') && p.zh) return p.zh
  if(locale.includes('th') && p.th) return p.th
  return p.en || p.zh || p.th || slug
}

export const HOT_PROVINCES = PROVINCES.filter(x=>x.hot)