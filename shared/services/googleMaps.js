/**
 * Google Maps API 服务
 * 提供Places API、Geocoding API和Places Details API功能
 */

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  /**
   * Places Autocomplete API - 地址自动补全
   * @param {string} input - 用户输入的地址
   * @param {object} options - 可选参数
   * @returns {Promise<Array>} 地址建议列表
   */
  async getPlaceAutocomplete(input, options = {}) {
    const {
      types = 'establishment', // 商店类型
      components = 'country:th', // 限制在泰国
      language = 'th'  // 默认使用泰语，支持泰语地址识别
    } = options;

    const params = new URLSearchParams({
      input,
      key: this.apiKey,
      types,
      components,
      language
    });

    try {
      const response = await fetch(`${this.baseUrl}/place/autocomplete/json?${params}`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.predictions.map(prediction => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || '',
          secondaryText: prediction.structured_formatting?.secondary_text || '',
          types: prediction.types
        }));
      } else {
        console.error('Places Autocomplete API Error:', data.status, data.error_message);
        return [];
      }
    } catch (error) {
      console.error('Places Autocomplete API 请求失败:', error);
      return [];
    }
  }

  /**
   * Places Details API - 获取地点详细信息
   * @param {string} placeId - Google Place ID
   * @param {object} options - 可选参数
   * @returns {Promise<object>} 地点详细信息
   */
  async getPlaceDetails(placeId, options = {}) {
    const {
      fields = 'name,formatted_address,geometry,rating,opening_hours,formatted_phone_number,website',
      language = 'th'  // 默认使用泰语，获取泰语门店信息
    } = options;

    const params = new URLSearchParams({
      place_id: placeId,
      fields,
      key: this.apiKey,
      language
    });

    try {
      const response = await fetch(`${this.baseUrl}/place/details/json?${params}`);
      const data = await response.json();
      
      if (data.status === 'OK') {
        const place = data.result;
        return {
          name: place.name || '',
          address: place.formatted_address || '',
          lat: place.geometry?.location?.lat || null,
          lng: place.geometry?.location?.lng || null,
          rating: place.rating || null,
          phone: place.formatted_phone_number || '',
          website: place.website || '',
          openingHours: place.opening_hours ? {
            weekdayText: place.opening_hours.weekday_text || [],
            openNow: place.opening_hours.open_now || false
          } : null,
          addressComponents: place.address_components || []
        };
      } else {
        console.error('Places Details API Error:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('Places Details API 请求失败:', error);
      return null;
    }
  }

  /**
   * Geocoding API - 地址转换为坐标
   * @param {string} address - 地址
   * @param {object} options - 可选参数
   * @returns {Promise<object>} 坐标信息
   */
  async geocodeAddress(address, options = {}) {
    const {
      components = 'country:TH', // 限制在泰国
      language = 'th'  // 使用泰语进行地址解析
    } = options;

    const params = new URLSearchParams({
      address,
      key: this.apiKey,
      components,
      language
    });

    try {
      const response = await fetch(`${this.baseUrl}/geocode/json?${params}`);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          address: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          placeId: result.place_id || null,
          addressComponents: result.address_components || []
        };
      } else {
        console.error('Geocoding API Error:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('Geocoding API 请求失败:', error);
      return null;
    }
  }

  /**
   * 反向地理编码 - 坐标转换为地址
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @param {object} options - 可选参数
   * @returns {Promise<object>} 地址信息
   */
  async reverseGeocode(lat, lng, options = {}) {
    const {
      language = 'th'  // 使用泰语进行反向地理编码
    } = options;

    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.apiKey,
      language
    });

    try {
      const response = await fetch(`${this.baseUrl}/geocode/json?${params}`);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          address: result.formatted_address,
          placeId: result.place_id || null,
          addressComponents: result.address_components || []
        };
      } else {
        console.error('Reverse Geocoding API Error:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('Reverse Geocoding API 请求失败:', error);
      return null;
    }
  }

  /**
   * 提取城市信息
   * @param {Array} addressComponents - Google Maps 地址组件
   * @returns {string} 城市名称
   */
  extractCityFromComponents(addressComponents) {
    if (!addressComponents || !Array.isArray(addressComponents)) {
      return '';
    }

    // 寻找城市信息 (administrative_area_level_1 或 locality)
    const cityComponent = addressComponents.find(component => 
      component.types.includes('administrative_area_level_1') ||
      component.types.includes('locality') ||
      component.types.includes('sublocality')
    );

    return cityComponent ? cityComponent.long_name : '';
  }

  /**
   * 验证API密钥是否有效
   * @returns {Promise<boolean>} API密钥是否有效
   */
  async validateApiKey() {
    try {
      const response = await this.getPlaceAutocomplete('test', { types: 'geocode' });
      return Array.isArray(response);
    } catch (error) {
      console.error('API密钥验证失败:', error);
      return false;
    }
  }
}

// 导出单例实例
const googleMapsService = new GoogleMapsService();

module.exports = googleMapsService;