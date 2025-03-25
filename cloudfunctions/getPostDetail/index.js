// 获取帖子详情云函数 - 调用后端API
const cloud = require('wx-server-sdk')
const httpRequest = require('./httpRequest')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('调用getPostDetail云函数:', {
    用户openid: openid,
    帖子ID: event.postId,
    事件参数: event
  })
  
  if (!event.postId) {
    return {
      success: false,
      message: '帖子ID不能为空'
    }
  }
  
  try {
    // 调用后端API获取帖子详情
    const apiUrl = `https://nkuwiki.com/api/wxapp/posts/${event.postId}`;
    
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
      console.log('帖子详情查询结果:', responseData);
      
      return {
        success: true,
        post: responseData.data
      }
    } else {
      console.error('获取帖子详情API调用失败:', result);
      throw new Error('获取帖子详情失败');
    }
    
  } catch (err) {
    console.error('获取帖子详情失败：', err);
    return {
      success: false,
      message: '获取帖子详情失败'
    }
  }
} 