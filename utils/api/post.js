/**
 * 帖子相关API封装
 */

const request = require('../request');

/**
 * 获取帖子列表
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getPosts(params = {}) {
  try {
    // 提取查询参数
    const { 
      page = 1, 
      pageSize = 20,
      category_id,
      tag,
      status = 1,
      order_by = 'update_time DESC'
    } = params;
    
    // 构建查询参数
    const queryParams = {
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
    
    // 添加可选参数
    if (category_id) queryParams.category_id = category_id;
    if (tag) queryParams.tag = tag;
    if (status !== undefined) queryParams.status = status;
    if (order_by) queryParams.order_by = order_by;
    
    const result = await request.get('/api/wxapp/posts', queryParams);
    
    return {
      success: true,
      posts: result.data.posts,
      total: result.data.total,
      limit: result.data.limit,
      offset: result.data.offset
    };
  } catch (err) {
    console.error('获取帖子列表失败:', err);
    return {
      success: false,
      message: '获取帖子列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取帖子详情
 * @param {string} postId - 帖子ID
 * @param {boolean} updateView - 是否更新浏览量
 * @returns {Promise} - 返回Promise对象
 */
async function getPostDetail(postId, updateView = true) {
  try {
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const result = await request.get(`/api/wxapp/posts/${postId}`, { update_view: updateView });
    
    return {
      success: true,
      post: result.data
    };
  } catch (err) {
    console.error('获取帖子详情失败:', err);
    return {
      success: false,
      message: '获取帖子详情失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取帖子评论列表
 * @param {string} postId - 帖子ID
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getPostComments(postId, params = {}) {
  try {
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 提取查询参数
    const { 
      page = 1, 
      pageSize = 20,
      parent_id,
      sort_by
    } = params;
    
    // 构建查询参数
    const queryParams = {
      limit: pageSize,
      offset: (page - 1) * pageSize
    };
    
    if (parent_id !== undefined) queryParams.parent_id = parent_id;
    if (sort_by) queryParams.sort_by = sort_by;
    
    const result = await request.get(`/api/wxapp/posts/${postId}/comments`, queryParams);
    
    return {
      success: true,
      comments: result.data.comments,
      total: result.data.total,
      limit: result.data.limit,
      offset: result.data.offset
    };
  } catch (err) {
    console.error('获取评论列表失败:', err);
    return {
      success: false,
      message: '获取评论列表失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 点赞/取消点赞帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function likePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const result = await request.post(`/api/wxapp/posts/${postId}/like`, {}, {}, { openid });
    
    return {
      success: true,
      message: result.data.message,
      liked: result.data.liked,
      like_count: result.data.like_count,
      post_id: result.data.post_id,
      action: result.data.action
    };
  } catch (err) {
    console.error('点赞操作失败:', err);
    return {
      success: false,
      message: '点赞操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 创建帖子
 * @param {Object} postData - 帖子数据
 * @returns {Promise} - 返回Promise对象
 */
async function createPost(postData) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 检查必要字段
    if (!postData.title) {
      throw new Error('帖子标题不能为空');
    }
    
    if (!postData.content) {
      throw new Error('帖子内容不能为空');
    }
    
    // 准备帖子数据，确保符合API要求的格式
    const data = {
      title: postData.title,
      content: postData.content,
      images: postData.images || [],
      category_id: postData.category_id || 1,
      status: postData.isPublic !== undefined ? (postData.isPublic ? 1 : 0) : 1,
      allow_comment: postData.allow_comment !== undefined ? postData.allow_comment : 1,
      // 添加用户信息
      author_name: userInfo.nickName || userInfo.nick_name || '用户',
      author_avatar: userInfo.avatarUrl || userInfo.avatar || '',
    };
    
    // 准备URL查询参数
    const query = {
      openid: openid,
      nick_name: userInfo.nickName || userInfo.nick_name || '',
      avatar: userInfo.avatarUrl || userInfo.avatar || ''
    };
    
    console.debug('准备发送帖子数据:', data);
    console.debug('URL查询参数:', query);
    
    // 发送请求，通过query参数传递openid
    const result = await request.post('/api/wxapp/posts', data, {}, query);
    
    console.debug('帖子创建API响应:', result);
    
    return {
      success: true,
      post: result.data,
      message: '发布成功'
    };
  } catch (err) {
    console.error('发布帖子失败:', err);
    
    // 检查是否是网络错误
    if (err.code === -1) {
      return {
        success: false,
        message: '网络连接失败，请检查网络设置'
      };
    }
    
    // 检查是否是后端API错误
    if (err.code >= 400) {
      return {
        success: false,
        message: `服务器错误 (${err.code}): ${err.message || '未知错误'}`
      };
    }
    
    return {
      success: false,
      message: '发布帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 更新帖子
 * @param {string} postId - 帖子ID
 * @param {Object} postData - 帖子数据
 * @returns {Promise} - 返回Promise对象
 */
async function updatePost(postId, postData) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    // 将openid作为查询参数传递，而不是header
    const result = await request.put(`/api/wxapp/posts/${postId}`, postData, {}, { openid });
    
    return {
      success: true,
      post: result.data,
      message: '更新成功'
    };
  } catch (err) {
    console.error('更新帖子失败:', err);
    return {
      success: false,
      message: '更新帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 删除帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function deletePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const result = await request.delete(`/api/wxapp/posts/${postId}`, {}, {}, { openid });
    
    return {
      success: true,
      message: '删除成功'
    };
  } catch (err) {
    console.error('删除帖子失败:', err);
    return {
      success: false,
      message: '删除帖子失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 收藏帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function favoritePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const result = await request.post(`/api/wxapp/posts/${postId}/favorite`, {}, {}, { openid });
    
    return {
      success: true,
      message: result.data.message,
      favorite: result.data.favorite,
      favorite_count: result.data.favorite_count,
      post_id: result.data.post_id,
      action: result.data.action
    };
  } catch (err) {
    console.error('收藏操作失败:', err);
    return {
      success: false,
      message: '收藏操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消收藏帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function unfavoritePost(postId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!postId) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    const result = await request.post(`/api/wxapp/posts/${postId}/unfavorite`, {}, {}, { openid });
    
    return {
      success: true,
      message: result.data.message,
      favorite: result.data.favorite,
      favorite_count: result.data.favorite_count,
      post_id: result.data.post_id,
      action: result.data.action
    };
  } catch (err) {
    console.error('取消收藏操作失败:', err);
    return {
      success: false,
      message: '取消收藏操作失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户发布的帖子
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid
 * @param {boolean} params.countOnly - 是否只获取数量
 * @param {boolean} params.includePostData - 是否包含帖子详细数据
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise} - 返回Promise对象
 */
async function getUserPosts(params = {}) {
  try {
    // 优先使用传入的openid，否则从存储中获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('未提供openid且未登录');
    }
    
    console.debug('获取用户帖子:', { openid, params });
    
    // 构建请求参数 - 包含openid用于筛选
    const requestParams = {
      openid: openid,
      limit: params.pageSize || 10,
      offset: ((params.page || 1) - 1) * (params.pageSize || 10)
    };
    
    // 实际接口只有GET /api/wxapp/posts，通过查询参数筛选用户
    const result = await request.get('/api/wxapp/posts', requestParams);
    console.debug('获取用户帖子列表成功:', result);
    
    // 如果只需要数量
    if (params.countOnly) {
      return {
        success: true,
        count: result.data.total || 0,
        message: '获取帖子数量成功'
      };
    } else {
      return {
        success: true,
        posts: result.data.posts || [],
        total: result.data.total || 0,
        message: '获取帖子列表成功'
      };
    }
  } catch (err) {
    console.error('获取用户帖子失败:', err);
    return {
      success: false,
      message: '获取用户帖子失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  getPosts,
  getPostDetail,
  getPostComments,
  likePost,
  createPost,
  updatePost,
  deletePost,
  favoritePost,
  unfavoritePost,
  getUserPosts
}; 