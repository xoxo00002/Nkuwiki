// 云函数入口文件 - 获取OpenID
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 这个云函数保持简单，只返回OpenID
  // 不需要调用后端API，因为OpenID是从微信获取的
  // 前端可以获取OpenID后自行调用登录API
  
  return {
    code: 0,
    message: '获取成功',
    data: {
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID || '',
    }
  }
}