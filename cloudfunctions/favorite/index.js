// 收藏功能云函数 - 改为后端API调用
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

// 切换收藏状态 
async function toggleFavorite(openid, postId) {
  console.log('处理收藏请求:', { openid, postId });
  
  if (!openid || !postId) {
    console.log('参数错误:', { openid, postId });
    return {
      success: false,
      message: '参数错误'
    };
  }

  try {
    // 调用后端API进行收藏/取消收藏操作
    const apiUrl = `/api/wxapp/posts/${postId}/favorite`;
    
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
      const isFavorited = responseData.data.is_favorited;
      
      return {
        success: true,
        hasFavorited: isFavorited,
        message: isFavorited ? '收藏成功' : '取消收藏成功'
      };
    } else {
      console.error('收藏API调用失败:', result);
      throw new Error('收藏操作失败');
    }
    
  } catch (err) {
    console.error('收藏操作失败:', err);
    return {
      success: false,
      message: '操作失败：' + err.message
    };
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { postId } = event;
  
  console.log('接收到的收藏请求:', {
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
    return await toggleFavorite(wxContext.OPENID, postId);
  } catch (err) {
    console.error('云函数执行错误:', err);
    return {
      success: false,
      message: '服务器错误：' + err.message
    };
  }
}; 