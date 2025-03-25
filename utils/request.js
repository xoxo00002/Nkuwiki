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
 * @returns {Promise} - 返回Promise对象
 */
function request(url, method = 'GET', data = {}, header = {}) {
  // 获取存储的openid
  const openid = wx.getStorageSync('openid') || '';
  
  // 默认请求头
  const defaultHeader = {
    'content-type': 'application/json',
  };
  
  // 若有openid则添加到请求头
  if (openid) {
    defaultHeader['X-User-OpenID'] = openid;
    
    // 如果是 POST/PUT 请求且没有明确设置 openid，则添加到请求体中
    if ((method === 'POST' || method === 'PUT') && data && !data.openid) {
      data.openid = openid;
    }
  }

  // 合并请求头
  const finalHeader = {...defaultHeader, ...header};
  
  // 调试输出
  console.debug(`请求: ${method} ${url}`, {
    data: data,
    header: finalHeader
  });
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: finalHeader,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 请求成功
          resolve(res.data);
        } else {
          // HTTP请求成功，但业务状态失败
          console.error('请求失败:', res);
          reject({
            code: res.data.code || res.statusCode,
            message: res.data.message || '请求失败',
            details: res.data.details
          });
        }
      },
      fail(err) {
        // 请求失败
        console.error('网络请求失败:', err);
        reject({
          code: -1,
          message: '网络请求失败'
        });
      }
    });
  });
}

// 导出请求方法
module.exports = {
  // GET请求
  get: (url, data = {}, header = {}) => request(url, 'GET', data, header),
  
  // POST请求
  post: (url, data = {}, header = {}) => request(url, 'POST', data, header),
  
  // PUT请求
  put: (url, data = {}, header = {}) => request(url, 'PUT', data, header),
  
  // DELETE请求
  delete: (url, data = {}, header = {}) => request(url, 'DELETE', data, header)
}; 