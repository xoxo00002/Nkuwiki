/**
 * 后端API请求工具类
 */

// API基础路径
const BASE_URL = 'https://nkuwiki.com';

/**
 * 封装微信请求方法
 * @param {string} url - 接口路径
 * @param {string} method - 请求方法
 * @param {object} data - 请求数据
 * @param {object} header - 请求头
 * @param {object} query - URL查询参数
 * @returns {Promise} - 返回Promise对象
 */
function request(url, method = 'GET', data = {}, header = {}, query = {}) {
  // 获取存储的openid
  const openid = wx.getStorageSync('openid') || '';
  
  // 默认请求头
  const defaultHeader = {
    'content-type': 'application/json',
  };
  
  // 若有openid则添加到请求头
  if (openid) {
    defaultHeader['X-User-OpenID'] = openid;
    
    // 如果是 GET 或 DELETE 请求，可以考虑添加openid作为查询参数
    if ((method === 'GET' || method === 'DELETE') && data && !data.openid) {
      data.openid = openid;
    }
    
    // 注意：对于PUT请求，openid通常在URL中而不是请求体，因此不在这里添加
  }

  // 合并请求头
  const finalHeader = {...defaultHeader, ...header};
  
  // 处理查询参数
  let finalUrl = url;
  if (query && Object.keys(query).length > 0) {
    const queryString = Object.keys(query)
      .filter(key => query[key] !== undefined && query[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');
    
    if (queryString) {
      finalUrl += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  // 调试输出
  console.debug(`请求: ${method} ${finalUrl}`, {
    method: method,
    url: `${BASE_URL}${finalUrl}`,
    data: data,
    header: finalHeader
  });
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${finalUrl}`,
      method,
      data,
      header: finalHeader,
      success(res) {
        console.debug(`响应: ${method} ${finalUrl}`, {
          statusCode: res.statusCode,
          data: res.data
        });
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 请求成功
          resolve(res.data);
        } else {
          // HTTP请求成功，但业务状态失败
          console.error('请求失败:', {
            url: `${BASE_URL}${finalUrl}`,
            method: method,
            requestData: data,
            statusCode: res.statusCode,
            response: res.data
          });
          reject({
            code: res.data.code || res.statusCode,
            message: res.data.message || '请求失败',
            details: res.data.details
          });
        }
      },
      fail(err) {
        // 请求失败
        console.error('网络请求失败:', {
          url: `${BASE_URL}${finalUrl}`,
          method: method,
          requestData: data,
          error: err
        });
        reject({
          code: -1,
          message: '网络请求失败: ' + (err.errMsg || '未知错误')
        });
      }
    });
  });
}

// 导出请求方法
module.exports = {
  // GET请求
  get: (url, data = {}, header = {}, query = {}) => request(url, 'GET', data, header, query),
  
  // POST请求
  post: (url, data = {}, header = {}, query = {}) => request(url, 'POST', data, header, query),
  
  // PUT请求
  put: (url, data = {}, header = {}, query = {}) => request(url, 'PUT', data, header, query),
  
  // DELETE请求
  delete: (url, data = {}, header = {}, query = {}) => request(url, 'DELETE', data, header, query)
}; 