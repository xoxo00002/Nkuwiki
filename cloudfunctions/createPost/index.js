const cloud = require('wx-server-sdk')
cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { content, images = [], title = '', isPublic = true } = event
  
  // 在云函数开始时记录所有参数
  console.log('createPost函数参数:', {
    content, 
    images, 
    title, 
    isPublic,
    OPENID
  })
  
  // 检查标题和内容是否为空
  if (!title.trim()) {
    return {
      code: -1,
      message: '帖子标题不能为空'
    }
  }
  
  if (!content.trim()) {
    return {
      code: -1,
      message: '帖子内容不能为空'
    }
  }

  try {
    // 检查图片格式，确保所有图片都是合法的云存储URL
    const validImages = Array.isArray(images) ? images.filter(img => 
      typeof img === 'string' && 
      (
        img.startsWith('cloud://') || 
        img.startsWith('https://') || 
        img.startsWith('http://')
      )
    ) : [];
    
    console.log('有效图片列表:', validImages);
    
    // 构建创建帖子的数据
    const postData = {
      title,
      content,
      images: validImages,
      is_public: isPublic !== false
    }
    
    // 调用后端API创建帖子
    const apiUrl = '/api/wxapp/posts'
    
    // 使用云函数http请求能力访问API
    const result = await cloud.httpApi.invoke({
      method: 'POST',
      url: 'https://nkuwiki.com' + apiUrl,
      body: postData,
      headers: {
        'Content-Type': 'application/json',
        'X-User-OpenID': OPENID
      }
    })

    // 处理API响应
    if (result.statusCode === 200 || result.statusCode === 201) {
      const responseData = JSON.parse(result.body)
      
      console.log('创建帖子结果：', responseData)
      
      return {
        code: 0,
        data: responseData.data.id,
        message: '发布成功'
      }
    } else {
      console.error('创建帖子API调用失败:', result)
      throw new Error('创建帖子失败')
    }

  } catch (err) {
    console.error('发布失败：', err)
    return {
      code: -1,
      message: '发布失败: ' + (err.message || '')
    }
  }
} 