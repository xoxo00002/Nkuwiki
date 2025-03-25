// 云函数入口文件 - 改为后端API调用
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const type = event.type
  
  console.log('调用getUserlike_fav_comment云函数:', {
    用户openid: openid,
    类型: type,
    事件参数: event
  })
  
  try {
    const { page = 1, pageSize = 10 } = event
    
    console.log('开始获取列表, 请求参数:', { 
      openid: openid,
      类型: type,
      页码: page,
      每页数量: pageSize
    })
    
    // 根据类型确定API路径
    let apiUrl = '';
    if (type === 'like') {
      apiUrl = `/api/wxapp/users/liked_posts?openid=${openid}&page=${page}&limit=${pageSize}`;
    } else if (type === 'star') {
      apiUrl = `/api/wxapp/users/favorite_posts?openid=${openid}&page=${page}&limit=${pageSize}`;
    } else if (type === 'comment') {
      apiUrl = `/api/wxapp/users/commented_posts?openid=${openid}&page=${page}&limit=${pageSize}`;
    } else {
      throw new Error('未知的查询类型');
    }
    
    // 使用云函数http请求能力访问API
    const result = await cloud.httpApi.invoke({
      method: 'GET',
      url: 'https://nkuwiki.com' + apiUrl,
      headers: {
        'X-User-OpenID': openid
      }
    });

    // 处理API响应
    if (result.statusCode === 200) {
      const responseData = JSON.parse(result.body);
      console.log('查询结果:', responseData);
      
      return {
        success: true,
        posts: responseData.data.posts,
        total: responseData.data.total
      }
    } else {
      console.error('获取列表API调用失败:', result);
      throw new Error('获取列表失败');
    }
    
  } catch (err) {
    console.error('获取列表失败：', err);
    return {
      success: false,
      message: '获取列表失败: ' + err.message
    }
  }
}