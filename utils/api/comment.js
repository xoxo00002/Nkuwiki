/**
 * 评论相关API封装
 */

const request = require('../request');

/**
 * 创建评论
 * @param {Object} commentData - 评论数据
 * @returns {Promise} - 返回Promise对象
 */
async function createComment(commentData) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentData.post_id) {
      return {
        success: false,
        message: '帖子ID不能为空'
      };
    }
    
    if (!commentData.content && (!commentData.images || commentData.images.length === 0)) {
      return {
        success: false,
        message: '评论内容不能为空'
      };
    }
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 准备评论数据
    const data = {
      ...commentData,
      nick_name: userInfo.nick_name,
      avatar: userInfo.avatar
    };
    
    const result = await request.post('/api/wxapp/comments', data, {
      openid
    });
    
    return {
      success: true,
      comment: result.data,
      message: '评论成功'
    };
  } catch (err) {
    console.error('发表评论失败:', err);
    return {
      success: false,
      message: '发表评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 更新评论
 * @param {string} commentId - 评论ID
 * @param {Object} commentData - 评论数据
 * @returns {Promise} - 返回Promise对象
 */
async function updateComment(commentId, commentData) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    const result = await request.put(`/api/wxapp/comments/${commentId}`, commentData, {
      openid
    });
    
    return {
      success: true,
      comment: result.data,
      message: '更新成功'
    };
  } catch (err) {
    console.error('更新评论失败:', err);
    return {
      success: false,
      message: '更新评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 删除评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function deleteComment(commentId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    const result = await request.delete(`/api/wxapp/comments/${commentId}`, { openid });
    
    return {
      success: true,
      message: '删除成功'
    };
  } catch (err) {
    console.error('删除评论失败:', err);
    return {
      success: false,
      message: '删除评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 点赞评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function likeComment(commentId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    const result = await request.post(`/api/wxapp/comments/${commentId}/like`, { openid });
    
    return {
      success: true,
      message: result.data.message,
      liked: result.data.liked,
      like_count: result.data.like_count,
      comment_id: result.data.comment_id,
      action: result.data.action
    };
  } catch (err) {
    console.error('点赞评论失败:', err);
    return {
      success: false,
      message: '点赞评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 取消点赞评论
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function unlikeComment(commentId) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    const result = await request.post(`/api/wxapp/comments/${commentId}/unlike`, { openid });
    
    return {
      success: true,
      message: result.data.message,
      liked: result.data.liked,
      like_count: result.data.like_count,
      comment_id: result.data.comment_id,
      action: result.data.action
    };
  } catch (err) {
    console.error('取消点赞评论失败:', err);
    return {
      success: false,
      message: '取消点赞评论失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取评论详情
 * @param {string} commentId - 评论ID
 * @returns {Promise} - 返回Promise对象
 */
async function getCommentDetail(commentId) {
  try {
    if (!commentId) {
      return {
        success: false,
        message: '评论ID不能为空'
      };
    }
    
    const result = await request.get(`/api/wxapp/comments/${commentId}`);
    
    return {
      success: true,
      comment: result.data
    };
  } catch (err) {
    console.error('获取评论详情失败:', err);
    return {
      success: false,
      message: '获取评论详情失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentDetail
}; 