const cloud = require('wx-server-sdk')
const httpRequest = require('./httpRequest')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { nickName, status, avatarUrl, userId, loginType } = event

  console.log('调用updateUser云函数:', {
    用户openid: openid,
    事件参数: event
  })

  try {
    // 构建更新数据对象，只包含实际需要更新的字段
    const updateData = {}
    
    // 只有当字段有值时才更新该字段
    if (nickName !== undefined) updateData.nick_name = nickName
    if (status !== undefined) updateData.bio = status
    if (avatarUrl !== undefined) updateData.avatar = avatarUrl
    
    console.log('更新数据:', updateData)
    
    // 调用后端API更新用户信息 - 按照API文档规范的URL格式
    const apiUrl = `https://nkuwiki.com/api/wxapp/users/${openid}`;
    
    // 使用自定义HTTP请求工具访问API
    const result = await httpRequest.request({
      url: apiUrl,
      method: 'PUT',  // 使用PUT方法
      data: updateData,
      headers: {
        'Content-Type': 'application/json',
        'X-User-OpenID': openid
      }
    });

    console.log('API响应:', result)

    // 处理API响应
    if (result.statusCode === 200) {
      const responseData = result.data;
      
      return {
        code: 0,
        success: true,
        message: '更新成功',
        data: responseData.data
      }
    } else {
      console.error('更新用户API调用失败:', result)
      throw new Error('更新用户API调用失败: ' + JSON.stringify(result.data || {}))
    }
    
  } catch (err) {
    console.error('[updateUser] 错误：', err)
    return {
      code: -1,
      success: false,
      message: err.message || '更新失败'
    }
  }
} 