// 通用HTTP请求工具函数
const https = require('https');
const url = require('url');

/**
 * 发送HTTP请求
 * @param {Object} options - 请求配置
 * @param {string} options.url - 完整URL
 * @param {string} options.method - 请求方法 (GET, POST, PUT, DELETE等)
 * @param {Object} [options.data] - 请求体数据
 * @param {Object} [options.headers] - 请求头
 * @returns {Promise<Object>} - 返回解析后的响应数据
 */
async function request(options) {
  return new Promise((resolve, reject) => {
    const { hostname, port, path } = url.parse(options.url);
    
    // 准备请求数据
    let data = null;
    if (options.data) {
      data = JSON.stringify(options.data);
    }
    
    // 准备请求选项
    const requestOptions = {
      hostname,
      port: port || 443,
      path,
      method: options.method,
      headers: options.headers || {}
    };
    
    // 如果有请求体，添加内容长度
    if (data) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(data);
      // 默认设置Content-Type为JSON
      if (!requestOptions.headers['Content-Type']) {
        requestOptions.headers['Content-Type'] = 'application/json';
      }
    }
    
    // 创建请求
    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      
      // 接收数据
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      // 请求完成
      res.on('end', () => {
        try {
          // 尝试解析JSON响应
          const jsonResponse = JSON.parse(responseData);
          
          // 返回响应结果
          resolve({
            statusCode: res.statusCode,
            data: jsonResponse,
            headers: res.headers
          });
        } catch (error) {
          // JSON解析失败，返回原始响应
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });
    
    // 请求错误处理
    req.on('error', (error) => {
      reject(error);
    });
    
    // 发送请求数据
    if (data) {
      req.write(data);
    }
    
    // 结束请求
    req.end();
  });
}

module.exports = {
  request
}; 