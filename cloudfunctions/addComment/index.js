// 云函数入口文件 - 改为后端API调用
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  console.log('添加评论:', {
    postId: event.postId,
    content: event.content,
    images: event.images,
    openid: openid
  })
  
  if (!event.postId) {
    return {
      success: false,
      message: '帖子ID不能为空'
    }
  }
  
  if (!event.content && (!event.images || event.images.length === 0)) {
    return {
      success: false,
      message: '评论内容不能为空'
    }
  }
  
  try {
    // 处理评论图片
    const images = event.images || [];
    
    // 确保图片URL是云存储路径或https链接
    const validImages = Array.isArray(images) ? images.filter(img => 
      typeof img === 'string' && 
      (
        img.startsWith('cloud://') || 
        img.startsWith('https://') || 
        img.startsWith('http://')
      )
    ) : [];
    
    console.log('有效图片列表:', validImages);
    
    // 构建评论数据
    const commentData = {
      content: event.content || '',
      images: validImages
    };
    
    // 调用后端API添加评论
    const apiUrl = `/api/wxapp/posts/${event.postId}/comments`;
    
    // 使用云函数http请求能力访问API
    const result = await cloud.httpApi.invoke({
      method: 'POST',
      url: 'https://nkuwiki.com' + apiUrl,
      body: commentData,
      headers: {
        'Content-Type': 'application/json',
        'X-User-OpenID': openid
      }
    });

    // 处理API响应
    if (result.statusCode === 200 || result.statusCode === 201) {
      const responseData = JSON.parse(result.body);
      
      console.log('评论添加结果:', responseData);
      
      return {
        success: true,
        comment: responseData.data
      }
    } else {
      console.error('添加评论API调用失败:', result);
      throw new Error('添加评论失败');
    }
    
  } catch (err) {
    console.error('添加评论出错:', err);
    return {
      success: false,
      message: err.message || '添加评论失败'
    }
  }
} 