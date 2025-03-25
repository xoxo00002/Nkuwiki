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
    
    const result = await request.post(`/api/wxapp/posts/${postId}/like`, { openid });
    
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
    
    // 准备帖子数据
    const data = {
      ...postData,
      nick_name: userInfo.nick_name,
      avatar: userInfo.avatar
    };
    
    const result = await request.post('/api/wxapp/posts', data, {
      openid
    });
    
    return {
      success: true,
      post: result.data,
      message: '发布成功'
    };
  } catch (err) {
    console.error('发布帖子失败:', err);
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
    
    const result = await request.put(`/api/wxapp/posts/${postId}`, postData, {
      openid
    });
    
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
    
    const result = await request.delete(`/api/wxapp/posts/${postId}`, { openid });
    
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
    
    const result = await request.post(`/api/wxapp/posts/${postId}/favorite`, { openid });
    
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
    
    const result = await request.post(`/api/wxapp/posts/${postId}/unfavorite`, { openid });
    
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

module.exports = {
  getPosts,
  getPostDetail,
  getPostComments,
  likePost,
  createPost,
  updatePost,
  deletePost,
  favoritePost,
  unfavoritePost
}; 