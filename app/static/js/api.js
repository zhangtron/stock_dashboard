/**
 * API 封装模块
 * 处理所有与后端 API 的通信
 */
class API {
  static BASE_URL = '';  // 使用相对路径，自动适应当前域名
  static TIMEOUT = 30000;
  
  /**
   * 创建超时控制器
   * @param {number} ms - 超时时间（毫秒）
   * @returns {AbortController}
   */
  static createTimeoutController(ms = this.TIMEOUT) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller;
  }
  
  /**
   * 构建查询参数
   * @param {Object} params - 参数对象
   * @returns {string} 查询字符串
   */
  static buildQueryParams(params) {
    const query = new URLSearchParams();
    
    for (const key in params) {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        query.append(key, params[key]);
      }
    }
    
    return query.toString();
  }
  
  /**
   * 发送 HTTP 请求
   * @param {string} url - 请求 URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Response>}
   */
  static async fetch(url, options = {}) {
    const controller = this.createTimeoutController();
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      ...options,
    };
    
    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw error;
    }
  }
  
  /**
   * 获取基本面选股数据
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>} 选股数据
   */
  static async getScreeningData(params) {
    const queryParams = this.buildQueryParams(params);
    const url = `${this.BASE_URL}/api/screening${queryParams ? '?' + queryParams : ''}`;
    
    try {
      const response = await this.fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取选股数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取数据同步状态
   * @returns {Promise<Object>} 同步状态
   */
  static async getSyncStatus() {
    const url = `${this.BASE_URL}/api/sync/status`;
    
    try {
      const response = await this.fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取同步状态失败:', error);
      throw error;
    }
  }
  
  /**
   * 手动触发数据同步
   * @param {boolean} force - 是否强制全量同步
   * @returns {Promise<Object>} 同步结果
   */
  static async triggerSync(force = false) {
    const url = `${this.BASE_URL}/api/sync/trigger?force=${force}`;
    
    try {
      const response = await this.fetch(url, {
        method: 'POST',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('触发数据同步失败:', error);
      throw error;
    }
  }
  
  /**
   * 健康检查
   * @returns {Promise<Object>} 健康状态
   */
  static async healthCheck() {
    const url = `${this.BASE_URL}/health`;
    
    try {
      const response = await this.fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('健康检查失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取搜索建议
   * @param {string} query - 搜索关键词
   * @param {number} limit - 返回数量
   * @returns {Promise<Object>} 建议列表
   */
  static async getSearchSuggestions(query, limit = 10) {
    const queryParams = this.buildQueryParams({ q: query, limit });
    const url = `${this.BASE_URL}/api/screening/search/suggestions?${queryParams}`;
    
    try {
      const response = await this.fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取综合排名前N的股票
   * @param {number} limit - 返回数量
   * @returns {Promise<Object>} 前N名股票列表
   */
  static async getTopStocks(limit = 8) {
    const queryParams = this.buildQueryParams({ limit });
    const url = `${this.BASE_URL}/api/screening/top-stocks?${queryParams}`;
    
    try {
      const response = await this.fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取前N名股票失败:', error);
      throw error;
    }
  }
}

// 导出到全局作用域
window.API = API;
