// 获取用户点赞列表云函数 - 调用后端API
const cloud = require('wx-server-sdk')
const httpRequest = require('./httpRequest')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('调用getUserLikes云函数:', {
    用户openid: openid,
    事件参数: event
  })
  
  // 获取统计数据模式
  if (event.countOnly) {
    try {
      // 调用统计API
      const apiUrl = `https://nkuwiki.com/api/wxapp/users/likes/count?openid=${openid}`;
      
      // 使用自定义HTTP请求工具访问API
      const result = await httpRequest.request({
        url: apiUrl,
        method: 'GET',
        headers: {
          'X-User-OpenID': openid
        }
      });

      // 处理API响应
      if (result.statusCode === 200) {
        const responseData = result.data;
        console.log('统计结果:', responseData);
        
        return {
          success: true,
          count: responseData.data.count
        }
      } else {
        console.error('获取点赞统计API调用失败:', result);
        throw new Error('获取统计数据失败');
      }
      
    } catch (err) {
      console.error('获取点赞数量失败：', err);
      return {
        success: false,
        message: '获取数据失败'
      }
    }
  } else {
    // 获取点赞列表模式
    try {
      const { page = 1, pageSize = 10 } = event;
      
      console.log('开始获取点赞列表, 请求参数:', { 
        openid: openid,
        页码: page,
        每页数量: pageSize
      });
      
      // 调用后端API获取用户点赞列表
      const apiUrl = `https://nkuwiki.com/api/wxapp/users/likes?openid=${openid}&page=${page}&limit=${pageSize}`;
      
      // 使用自定义HTTP请求工具访问API
      const result = await httpRequest.request({
        url: apiUrl,
        method: 'GET',
        headers: {
          'X-User-OpenID': openid
        }
      });

      // 处理API响应
      if (result.statusCode === 200) {
        const responseData = result.data;
        console.log('查询结果:', responseData);
        
        return {
          success: true,
          likes: responseData.data.likes,
          total: responseData.data.total
        }
      } else {
        console.error('获取用户点赞API调用失败:', result);
        throw new Error('获取用户点赞列表失败');
      }
      
    } catch (err) {
      console.error('获取用户点赞列表失败：', err);
      return {
        success: false,
        message: '获取点赞列表失败'
      }
    }
  }
} 