const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');

// 计算两点间距离（公里）
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// 获取门店列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, lat, lng, search, city } = req.query;
    
    // 在实际应用中，这里应该从数据库获取门店列表
    // const { dbService } = await import('../storage.js');
    // const stores = await dbService.getAllStores();
    
    // 模拟门店数据
    let mockStores = [
      {
        id: 1,
        name: '星巴克中山店',
        address: '台北市中山区中山路123号',
        lat: 25.0330,
        lng: 121.5654,
        phone: '02-1234-5678',
        hours: '07:00-22:00',
        image_url: 'https://via.placeholder.com/400x300',
        code: 'SB001',
        status: 'active',
        services: ['WiFi', '插座', '外送'],
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: '星巴克台北101店',
        address: '台北市信义区信义路45号',
        lat: 25.0340,
        lng: 121.5630,
        phone: '02-8765-4321',
        hours: '06:30-23:00',
        image_url: 'https://via.placeholder.com/400x300',
        code: 'SB002',
        status: 'active',
        services: ['WiFi', '插座', '外送', '24小时营业'],
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: '海底捞火锅忠孝店',
        address: '台北市大安区忠孝东路456号',
        lat: 25.0415,
        lng: 121.5654,
        phone: '02-5555-6666',
        hours: '11:00-02:00',
        image_url: 'https://via.placeholder.com/400x300',
        code: 'HDL001',
        status: 'active',
        services: ['包厢', '外送', '宴会服务'],
        created_at: new Date().toISOString()
      },
      {
        id: 4,
        name: '麦当劳西门店',
        address: '台北市万华区西门路789号',
        lat: 25.0425,
        lng: 121.5070,
        phone: '02-7777-8888',
        hours: '24小时营业',
        image_url: 'https://via.placeholder.com/400x300',
        code: 'MCD001',
        status: 'active',
        services: ['得来速', '外送', '24小时营业'],
        created_at: new Date().toISOString()
      }
    ];

    // 搜索过滤
    if (search) {
      mockStores = mockStores.filter(store => 
        store.name.includes(search) || 
        store.address.includes(search)
      );
    }

    // 城市过滤
    if (city) {
      mockStores = mockStores.filter(store => 
        store.address.includes(city)
      );
    }

    // 如果提供了位置信息，计算距离并排序
    if (lat && lng) {
      mockStores = mockStores.map(store => ({
        ...store,
        distance: calculateDistance(
          parseFloat(lat), 
          parseFloat(lng), 
          parseFloat(store.lat), 
          parseFloat(store.lng)
        )
      })).sort((a, b) => a.distance - b.distance);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedStores = mockStores.slice(startIndex, endIndex);

    res.json({ 
      success: true,
      data: {
        stores: paginatedStores,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: mockStores.length,
          total_pages: Math.ceil(mockStores.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取门店列表失败',
      message: error.message 
    });
  }
});

// 获取门店详情
router.get('/:id', async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    const { lat, lng } = req.query;
    
    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的门店ID' 
      });
    }

    // 在实际应用中，这里应该从数据库获取门店详情
    // const { dbService } = await import('../storage.js');
    // const [store] = await dbService.getStoreById(storeId);
    
    // 模拟门店详情数据
    const mockStore = {
      id: storeId,
      name: '星巴克中山店',
      address: '台北市中山区中山路123号',
      lat: 25.0330,
      lng: 121.5654,
      phone: '02-1234-5678',
      hours: '07:00-22:00',
      image_url: 'https://via.placeholder.com/400x300',
      code: 'SB001',
      status: 'active',
      description: '位于中山区繁华地段，提供舒适的用餐环境和优质的咖啡体验。',
      services: ['WiFi', '插座', '外送', '包厢'],
      facilities: {
        wifi: true,
        parking: true,
        wheelchair_accessible: true,
        air_conditioning: true,
        outdoor_seating: false
      },
      operating_hours: {
        monday: '07:00-22:00',
        tuesday: '07:00-22:00',
        wednesday: '07:00-22:00',
        thursday: '07:00-22:00',
        friday: '07:00-23:00',
        saturday: '08:00-23:00',
        sunday: '08:00-22:00'
      },
      contact: {
        phone: '02-1234-5678',
        email: 'zhongshan@starbucks.com.tw',
        manager: '王小明'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 如果提供了位置信息，计算距离
    if (lat && lng) {
      mockStore.distance = calculateDistance(
        parseFloat(lat), 
        parseFloat(lng), 
        parseFloat(mockStore.lat), 
        parseFloat(mockStore.lng)
      );
    }

    res.json({ 
      success: true,
      data: mockStore
    });
  } catch (error) {
    console.error('Get store detail error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取门店详情失败',
      message: error.message 
    });
  }
});

// 计算门店距离
router.post('/distance', async (req, res) => {
  try {
    const { user_lat, user_lng, store_ids } = req.body;
    
    if (!user_lat || !user_lng) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少用户位置信息' 
      });
    }

    if (!store_ids || !Array.isArray(store_ids)) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少门店ID列表' 
      });
    }

    // 在实际应用中，这里应该从数据库获取指定门店信息
    // const { dbService } = await import('../storage.js');
    // const stores = await dbService.getStoresByIds(store_ids);
    
    // 模拟门店位置数据
    const mockStores = [
      { id: 1, name: '星巴克中山店', lat: 25.0330, lng: 121.5654 },
      { id: 2, name: '星巴克台北101店', lat: 25.0340, lng: 121.5630 },
      { id: 3, name: '海底捞火锅忠孝店', lat: 25.0415, lng: 121.5654 },
      { id: 4, name: '麦当劳西门店', lat: 25.0425, lng: 121.5070 }
    ];

    // 计算距离
    const storesWithDistance = mockStores
      .filter(store => store_ids.includes(store.id))
      .map(store => ({
        ...store,
        distance: calculateDistance(
          parseFloat(user_lat), 
          parseFloat(user_lng), 
          parseFloat(store.lat), 
          parseFloat(store.lng)
        )
      }))
      .sort((a, b) => a.distance - b.distance);

    res.json({ 
      success: true,
      data: {
        user_location: {
          lat: parseFloat(user_lat),
          lng: parseFloat(user_lng)
        },
        stores: storesWithDistance,
        nearest_store: storesWithDistance[0] || null
      }
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({ 
      success: false, 
      error: '计算门店距离失败',
      message: error.message 
    });
  }
});

// 搜索附近门店
router.post('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.body; // radius in kilometers
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少位置信息' 
      });
    }

    // 在实际应用中，这里应该使用地理位置查询
    // const { dbService } = await import('../storage.js');
    // const nearbyStores = await dbService.getNearbyStores(lat, lng, radius);
    
    // 模拟附近门店数据
    const mockStores = [
      { id: 1, name: '星巴克中山店', lat: 25.0330, lng: 121.5654, address: '台北市中山区中山路123号' },
      { id: 2, name: '星巴克台北101店', lat: 25.0340, lng: 121.5630, address: '台北市信义区信义路45号' },
      { id: 3, name: '海底捞火锅忠孝店', lat: 25.0415, lng: 121.5654, address: '台北市大安区忠孝东路456号' }
    ];

    // 计算距离并过滤在指定半径内的门店
    const nearbyStores = mockStores
      .map(store => ({
        ...store,
        distance: calculateDistance(
          parseFloat(lat), 
          parseFloat(lng), 
          parseFloat(store.lat), 
          parseFloat(store.lng)
        )
      }))
      .filter(store => store.distance <= parseFloat(radius))
      .sort((a, b) => a.distance - b.distance);

    res.json({ 
      success: true,
      data: {
        search_location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        },
        search_radius: parseFloat(radius),
        stores: nearbyStores,
        total: nearbyStores.length
      }
    });
  } catch (error) {
    console.error('Search nearby stores error:', error);
    res.status(500).json({ 
      success: false, 
      error: '搜索附近门店失败',
      message: error.message 
    });
  }
});

// 获取门店营业状态
router.get('/:id/status', async (req, res) => {
  try {
    const storeId = parseInt(req.params.id);
    
    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的门店ID' 
      });
    }

    // 在实际应用中，这里应该检查门店的实时营业状态
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ...
    
    // 模拟营业时间检查
    let isOpen = false;
    let openTime = '07:00';
    let closeTime = '22:00';
    
    if (currentDay >= 1 && currentDay <= 5) { // 周一到周五
      isOpen = currentHour >= 7 && currentHour < 22;
    } else if (currentDay === 6) { // 周六
      isOpen = currentHour >= 8 && currentHour < 23;
      openTime = '08:00';
      closeTime = '23:00';
    } else { // 周日
      isOpen = currentHour >= 8 && currentHour < 22;
      openTime = '08:00';
      closeTime = '22:00';
    }

    res.json({ 
      success: true,
      data: {
        store_id: storeId,
        is_open: isOpen,
        current_time: now.toISOString(),
        today_hours: {
          open: openTime,
          close: closeTime
        },
        status_message: isOpen ? '营业中' : '休息中'
      }
    });
  } catch (error) {
    console.error('Get store status error:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取门店状态失败',
      message: error.message 
    });
  }
});

module.exports = router;