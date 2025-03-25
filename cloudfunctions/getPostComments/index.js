// 获取帖子评论列表云函数 - 调用后端API
const cloud = require('wx-server-sdk')
const httpRequest = require('./httpRequest')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('调用getPostComments云函数:', {
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
    // 提取查询参数
    const { 
      page = 1, 
      pageSize = 20
    } = event;
    
    // 计算offset
    const offset = (page - 1) * pageSize;
    
    // 构建查询参数
    const queryParams = new URLSearchParams();
    queryParams.append('limit', pageSize);
    queryParams.append('offset', offset);
    
    // 调用后端API获取帖子评论列表
    const apiUrl = `https://nkuwiki.com/api/wxapp/posts/${event.postId}/comments?${queryParams.toString()}`;
    
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
      console.log('评论列表查询结果:', responseData);
      
      return {
        success: true,
        comments: responseData.data.comments,
        total: responseData.data.total,
        limit: responseData.data.limit,
        offset: responseData.data.offset
      }
    } else {
      console.error('获取评论列表API调用失败:', result);
      throw new Error('获取评论列表失败');
    }
    
  } catch (err) {
    console.error('获取评论列表失败：', err);
    return {
      success: false,
      message: '获取评论列表失败'
    }
  }
} 