// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { openid } = event
  
  // 使用传入的openid或当前用户的openid
  const userOpenid = openid || wxContext.OPENID

  if (!userOpenid) {
    return {
      success: false,
      message: '未获取到用户ID'
    }
  }

  try {
    // 查询用户信息
    const userQuery = await db.collection('users').where({
      openid: userOpenid
    }).get()

    if (!userQuery.data || userQuery.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    const user = userQuery.data[0]
    
    // 查询用户发布的所有帖子
    const postsQuery = await db.collection('posts').where({
      _openid: userOpenid
    }).get()
    
    // 计算所有帖子获得的点赞总数
    let totalLikes = 0
    if (postsQuery.data && postsQuery.data.length > 0) {
      postsQuery.data.forEach(post => {
        totalLikes += post.likes || 0
      })
    }
    
    // 如果用户信息中已有likes字段并且和计算的不一致，更新用户的likes字段
    if (user.likes !== totalLikes) {
      await db.collection('users').doc(user._id).update({
        data: {
          likes: totalLikes
        }
      })
    }

    return {
      success: true,
      count: totalLikes,
      message: '获取用户获赞数成功'
    }
  } catch (error) {
    console.error('获取用户获赞数失败：', error)
    return {
      success: false,
      message: '获取用户获赞数失败：' + error.message
    }
  }
} 