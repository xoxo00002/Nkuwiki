// 修复用户点赞数据云函数 - 调用后端API
const cloud = require('wx-server-sdk')
const httpRequest = require('./httpRequest')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = event.openid || wxContext.OPENID
  
  console.log('调用fixUserLikes云函数:', {
    用户openid: openid,
    事件参数: event
  })
  
  try {
    // 调用后端API修复用户点赞数据
    const apiUrl = `https://nkuwiki.com/api/wxapp/users/likes/fix?openid=${openid}`;
    
    // 使用自定义HTTP请求工具访问API
    const result = await httpRequest.request({
      url: apiUrl,
      method: 'POST',
      data: {
        openid: openid,
        fix_type: event.fix_type || 'all'  // 可以是'all', 'count', 'relations'
      },
      headers: {
        'X-User-OpenID': openid,
        'Content-Type': 'application/json'
      }
    });

    // 处理API响应
    if (result.statusCode === 200) {
      const responseData = result.data;
      console.log('修复结果:', responseData);
      
      return {
        success: true,
        result: responseData.data,
        message: responseData.message || '修复成功'
      }
    } else {
      console.error('修复点赞数据API调用失败:', result);
      throw new Error('修复点赞数据失败');
    }
    
  } catch (err) {
    console.error('修复点赞数据失败：', err);
    return {
      success: false,
      message: '修复点赞数据失败：' + (err.message || '')
    }
  }
} 