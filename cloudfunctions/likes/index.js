// 优化点赞云函数 - 改为后端API调用
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

// 切换点赞状态
async function toggleLike(openid, postId) {
  console.log('处理点赞请求:', { openid, postId });
  
  if (!openid || !postId) {
    console.log('参数错误:', { openid, postId });
    return {
      success: false,
      message: '参数错误'
    };
  }

  try {
    // 调用后端API进行点赞/取消点赞操作
    const apiUrl = `/api/wxapp/posts/${postId}/like`;
    
    // 使用云函数http请求能力访问API
    const result = await cloud.httpApi.invoke({
      method: 'POST',
      url: 'https://nkuwiki.com' + apiUrl,
      body: {},
      headers: {
        'Content-Type': 'application/json',
        'X-User-OpenID': openid
      }
    });

    // 处理API响应
    if (result.statusCode === 200) {
      const responseData = JSON.parse(result.body);
      const isLiked = responseData.data.is_liked;
      
      return {
        success: true,
        hasLiked: isLiked,
        message: isLiked ? '点赞成功' : '取消点赞成功'
      };
    } else {
      console.error('点赞API调用失败:', result);
      throw new Error('点赞操作失败');
    }
    
  } catch (err) {
    console.error('点赞操作失败:', err);
    return {
      success: false,
      message: '操作失败：' + err.message
    };
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { type, postId } = event;
  
  console.log('接收到的请求:', {
    type,
    postId,
    openid: wxContext.OPENID
  });

  if (!wxContext.OPENID) {
    return {
      success: false,
      message: '未获取到用户身份'
    };
  }

  try {
    switch (type) {
      case 'toggleLike':
        return await toggleLike(wxContext.OPENID, postId);
      default:
        return {
          success: false,
          message: '未知操作类型'
        };
    }
  } catch (err) {
    console.error('云函数执行错误:', err);
    return {
      success: false,
      message: '服务器错误：' + err.message
    };
  }
};