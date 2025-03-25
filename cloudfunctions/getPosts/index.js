// 获取公共帖子列表云函数 - 调用后端API
const cloud = require('wx-server-sdk')
const httpRequest = require('./httpRequest')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('调用getPosts云函数:', {
    用户openid: openid,
    事件参数: event
  })
  
  try {
    // 提取查询参数
    const { 
      page = 1, 
      pageSize = 20,
      category_id,
      tag,
      status = 1,
      order_by = 'update_time DESC'
    } = event;
    
    // 计算offset
    const offset = (page - 1) * pageSize;
    
    // 构建查询参数
    const queryParams = new URLSearchParams();
    queryParams.append('limit', pageSize);
    queryParams.append('offset', offset);
    
    // 添加可选参数
    if (category_id) queryParams.append('category_id', category_id);
    if (tag) queryParams.append('tag', tag);
    if (status) queryParams.append('status', status);
    if (order_by) queryParams.append('order_by', order_by);
    
    console.log('查询参数:', queryParams.toString());
    
    // 调用后端API获取帖子列表
    const apiUrl = `https://nkuwiki.com/api/wxapp/posts?${queryParams.toString()}`;
    
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
        posts: responseData.data.posts,
        total: responseData.data.total,
        limit: responseData.data.limit,
        offset: responseData.data.offset
      }
    } else {
      console.error('获取帖子列表API调用失败:', result);
      throw new Error('获取帖子列表失败');
    }
    
  } catch (err) {
    console.error('获取帖子列表失败：', err);
    return {
      success: false,
      message: '获取帖子列表失败'
    }
  }
} 