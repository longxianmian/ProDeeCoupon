import { PROVINCES } from '@/constants/provinces.js'

// 创建一个简单的Google Maps服务实例
class GoogleMapsService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    this.baseUrl = 'https://maps.googleapis.com/maps/api'
  }

  async reverseGeocode(lat, lng, options = {}) {
    const { language = 'en' } = options

    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.apiKey,
      language
    })

    try {
      const response = await fetch(`${this.baseUrl}/geocode/json?${params}`)
      const data = await response.json()
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0]
        return {
          address: result.formatted_address,
          placeId: result.place_id || null,
          addressComponents: result.address_components || []
        }
      } else {
        console.error('Reverse Geocoding API Error:', data.status, data.error_message)
        return null
      }
    } catch (error) {
      console.error('Reverse Geocoding API 请求失败:', error)
      return null
    }
  }
}

class LocationService {
  constructor() {
    this.googleMaps = new GoogleMapsService()
    this.autoLocationKey = 'auto_location_done'
    this.manualSelectionKey = 'manual_city_selection'
  }

  /**
   * 获取用户地理位置
   * @returns {Promise<{lat: number, lng: number} | null>}
   */
  async getCurrentPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('浏览器不支持地理定位')
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn('获取位置失败:', error.message)
          resolve(null)
        },
        {
          enableHighAccuracy: false,
          maximumAge: 300000, // 5分钟缓存
          timeout: 10000
        }
      )
    })
  }

  /**
   * 根据经纬度获取泰国府信息
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @returns {Promise<string | null>} - 返回省份代码，如 'bangkok'
   */
  async getProvinceFromCoordinates(lat, lng) {
    try {
      // 首先使用地理范围快速识别主要府
      const provinceByRange = this.getProvinceByCoordinateRange(lat, lng)
      if (provinceByRange) {
        console.log('通过坐标范围识别城市:', provinceByRange)
        return provinceByRange
      }

      // 如果范围识别失败，尝试Google Maps API
      const result = await this.googleMaps.reverseGeocode(lat, lng, { language: 'en' })
      if (!result || !result.addressComponents) {
        console.warn('Google Maps反向地理编码失败')
        return null
      }

      // 从地址组件中提取府信息
      const provinceInfo = this.extractThailandProvince(result.addressComponents)
      if (provinceInfo) {
        return this.mapToProvinceCode(provinceInfo)
      }

      return null
    } catch (error) {
      console.error('反向地理编码失败:', error)
      return null
    }
  }

  /**
   * 通过坐标范围快速识别泰国主要府
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @returns {string | null}
   */
  getProvinceByCoordinateRange(lat, lng) {
    // 泰国主要府的坐标范围（这是一个简化的实现）
    const provinceRanges = [
      // 曼谷及周边
      { code: 'bangkok', name: '曼谷府', lat: [13.5, 14.0], lng: [100.3, 100.9] },
      
      // 清迈府 - 你在这里！
      { code: 'chiang-mai', name: '清迈府', lat: [18.4, 19.0], lng: [98.7, 99.5] },
      
      // 清莱府
      { code: 'chiang-rai', name: '清莱府', lat: [19.7, 20.5], lng: [99.5, 100.5] },
      
      // 普吉府
      { code: 'phuket', name: '普吉府', lat: [7.7, 8.2], lng: [98.2, 98.5] },
      
      // 春武里府（芭提雅）
      { code: 'chon-buri', name: '春武里府', lat: [12.8, 13.8], lng: [100.7, 101.5] },
      
      // 素叻他尼府
      { code: 'surat-thani', name: '素叻他尼府', lat: [8.5, 9.8], lng: [98.8, 99.8] },
      
      // 那空叻差是玛府
      { code: 'nakhon-ratchasima', name: '那空叻差是玛府', lat: [14.5, 15.5], lng: [101.5, 102.8] },
      
      // 孔敬府
      { code: 'khon-kaen', name: '孔敬府', lat: [16.0, 16.8], lng: [102.5, 103.0] },
      
      // 乌汶叻差他尼府
      { code: 'ubon-ratchathani', name: '乌汶叻差他尼府', lat: [14.8, 15.8], lng: [104.5, 105.8] }
    ]

    // 检查坐标是否在任何府的范围内
    for (const province of provinceRanges) {
      if (lat >= province.lat[0] && lat <= province.lat[1] && 
          lng >= province.lng[0] && lng <= province.lng[1]) {
        console.log(`坐标 ${lat}, ${lng} 位于 ${province.name}`)
        return province.code
      }
    }

    console.log('坐标不在已知府范围内:', lat, lng)
    return null
  }

  /**
   * 从Google Maps地址组件中提取泰国府信息
   * @param {Array} addressComponents - Google Maps地址组件
   * @returns {string | null}
   */
  extractThailandProvince(addressComponents) {
    // 查找行政区域级别1（泰国的府）
    const provinceComponent = addressComponents.find(component =>
      component.types.includes('administrative_area_level_1')
    )

    if (provinceComponent) {
      return provinceComponent.long_name || provinceComponent.short_name
    }

    // 备用方案：查找locality
    const localityComponent = addressComponents.find(component =>
      component.types.includes('locality')
    )

    if (localityComponent) {
      return localityComponent.long_name || localityComponent.short_name
    }

    return null
  }

  /**
   * 将地址中的府名映射到我们的省份代码
   * @param {string} provinceName - 府名（英文或泰文）
   * @returns {string | null}
   */
  mapToProvinceCode(provinceName) {
    if (!provinceName) return null

    const normalizedName = provinceName.toLowerCase().trim()

    // 直接匹配英文名
    const exactMatch = PROVINCES.find(p => 
      p.en.toLowerCase() === normalizedName ||
      p.th === provinceName ||
      p.zh === provinceName
    )

    if (exactMatch) {
      return exactMatch.slug
    }

    // 模糊匹配（处理一些变体）
    const fuzzyMatch = PROVINCES.find(p => {
      const englishName = p.en.toLowerCase()
      const thaiName = p.th
      
      // 检查是否包含关键词
      return englishName.includes(normalizedName) || 
             normalizedName.includes(englishName) ||
             (thaiName && thaiName.includes(provinceName))
    })

    return fuzzyMatch ? fuzzyMatch.slug : null
  }

  /**
   * 自动定位并设置城市（仅在首次或未手动选择时执行）
   * @returns {Promise<string | null>} - 返回设置的省份代码
   */
  async autoLocateCity() {
    // 检查是否已经手动选择过城市
    if (localStorage.getItem(this.manualSelectionKey) === 'true') {
      console.log('用户已手动选择城市，跳过自动定位')
      return localStorage.getItem('province') || 'bangkok'
    }

    // 检查是否已经自动定位过
    if (localStorage.getItem(this.autoLocationKey) === 'true') {
      console.log('已完成自动定位，跳过')
      return localStorage.getItem('province') || 'bangkok'
    }

    try {
      console.log('开始自动定位用户城市...')
      
      // 获取用户位置
      const position = await this.getCurrentPosition()
      if (!position) {
        console.log('无法获取用户位置，使用默认城市')
        this.markAutoLocationDone()
        return 'bangkok'
      }

      console.log('用户位置:', position)

      // 根据位置获取府信息
      const provinceCode = await this.getProvinceFromCoordinates(position.lat, position.lng)
      
      if (provinceCode) {
        console.log('自动定位到城市:', provinceCode)
        this.setCity(provinceCode, false) // false表示这是自动设置，不是手动选择
        return provinceCode
      } else {
        console.log('无法识别用户所在府，使用默认城市')
        this.markAutoLocationDone()
        return 'bangkok'
      }

    } catch (error) {
      console.error('自动定位失败:', error)
      this.markAutoLocationDone()
      return 'bangkok'
    }
  }

  /**
   * 设置城市（支持区分自动/手动）
   * @param {string} provinceCode - 省份代码
   * @param {boolean} isManual - 是否为手动选择
   */
  setCity(provinceCode, isManual = true) {
    // 保存到localStorage
    localStorage.setItem('province', provinceCode)
    
    // 标记操作类型
    if (isManual) {
      localStorage.setItem(this.manualSelectionKey, 'true')
    } else {
      this.markAutoLocationDone()
    }

    // 触发城市变更事件，通知其他组件更新
    window.dispatchEvent(new CustomEvent('provinceChanged', { 
      detail: { province: provinceCode, isManual } 
    }))

    console.log(`城市已设置为: ${provinceCode} (${isManual ? '手动' : '自动'})`)
  }

  /**
   * 标记自动定位已完成
   */
  markAutoLocationDone() {
    localStorage.setItem(this.autoLocationKey, 'true')
  }

  /**
   * 重置定位状态（用于测试或重新定位）
   */
  resetLocationState() {
    localStorage.removeItem(this.autoLocationKey)
    localStorage.removeItem(this.manualSelectionKey)
  }

  /**
   * 检查是否已手动选择城市
   * @returns {boolean}
   */
  hasManualSelection() {
    return localStorage.getItem(this.manualSelectionKey) === 'true'
  }
}

export default new LocationService()