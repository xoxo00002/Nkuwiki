/**
 * 智能体相关API封装
 */

const request = require('../request');
// 从request.js获取基础URL
const BASE_URL = request.BASE_URL;

/**
 * 与智能体聊天
 * @param {Object} options - 聊天参数
 * @param {string} options.query - 用户提问内容
 * @param {boolean} options.stream - 是否使用流式响应，默认false
 * @param {string} options.format - 响应格式，支持"markdown"、"text"、"html"，默认"markdown"
 * @param {string} options.bot_tag - 指定使用的机器人，默认"default"
 * @param {function} options.onMessage - 流式响应消息回调
 * @param {function} options.onError - 错误回调
 * @param {function} options.onComplete - 完成回调
 * @returns {Promise} - 返回Promise对象，非流式情况下直接返回结果，流式情况下由回调函数处理
 */
async function chat(options = {}) {
  try {
    // 确保必要参数
    if (!options.query) {
      throw new Error('query参数不能为空');
    }

    // 获取用户openid
    const openid = wx.getStorageSync('openid') || '';
    
    // 构建请求参数
    const requestData = {
      query: options.query,
      openid: openid,
      stream: options.stream !== undefined ? options.stream : false,
      format: options.format || 'markdown',
      bot_tag: options.bot_tag || 'default'
    };

    console.debug('聊天请求参数:', requestData);

    // 非流式请求
    if (!requestData.stream) {
      const result = await request.post('/api/agent/chat', requestData);
      return {
        success: true,
        message: result.data?.message || '',
        sources: result.data?.sources || [],
        format: result.data?.format || 'markdown'
      };
    } 
    // 流式请求需要通过回调处理
    else {
      if (!options.onMessage || typeof options.onMessage !== 'function') {
        throw new Error('流式请求需要提供onMessage回调函数');
      }

      // 使用流式请求方法
      const requestTask = request.stream('/api/agent/chat', 'POST', requestData, {
        onMessage: options.onMessage,
        onError: options.onError,
        onComplete: options.onComplete
      });

      return {
        success: true,
        requestTask
      };
    }
  } catch (err) {
    console.error('聊天API调用失败:', err);
    return {
      success: false,
      message: '聊天失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 搜索知识库
 * @param {Object} params - 搜索参数
 * @param {string} params.keyword - 搜索关键词
 * @param {number} params.limit - 返回结果数量限制，默认10
 * @returns {Promise} - 返回Promise对象
 */
async function search(params = {}) {
  try {
    // 确保必要参数
    if (!params.keyword) {
      throw new Error('keyword参数不能为空');
    }

    const requestData = {
      keyword: params.keyword,
      limit: params.limit || 10
    };

    const result = await request.post('/api/agent/search', requestData);
    
    return {
      success: true,
      results: result.data?.results || [],
      total: result.data?.total || 0,
      keyword: params.keyword
    };
  } catch (err) {
    console.error('搜索API调用失败:', err);
    return {
      success: false,
      message: '搜索失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取Agent状态
 * @returns {Promise} - 返回Promise对象
 */
async function getStatus() {
  try {
    const result = await request.get('/api/agent/status');
    
    return {
      success: true,
      status: result.data?.status || 'unknown',
      version: result.data?.version || '',
      capabilities: result.data?.capabilities || [],
      formats: result.data?.formats || []
    };
  } catch (err) {
    console.error('获取Agent状态失败:', err);
    return {
      success: false,
      message: '获取状态失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  chat,
  search,
  getStatus
}; 