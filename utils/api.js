/**
 * API接口封装
 * 将原云函数功能迁移到客户端，避开云函数3秒超时限制
 */

const request = require('./request');

// 用户相关API
const userApi = {
  /**
   * 用户登录/同步
   * @param {Object} userData - 用户数据
   * @returns {Promise} - 返回Promise对象
   */
  login: async (userData = {}) => {
    try {
      console.log('开始登录/同步用户:', userData);
      
      // 获取登录代码
      const { code } = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });
      
      // 获取OpenID
      let openid = wx.getStorageSync('openid');
      
      // 如果本地没有存储openid，需要先通过wx.login获取
      if (!openid && code) {
        // 这里可以添加从服务器获取openid的逻辑
        // 暂时跳过，使用userData中的openid
        // 实际项目中不应这样处理，应该通过服务端接口获取
        console.log('本地没有openid，需要从服务器获取');
      }
      
      // 准备用户数据
      const syncData = {
        openid: openid || '', // 实际应从服务端获取
        unionid: userData.unionid || '',
        nick_name: userData.nickName || '',
        avatar: userData.avatarUrl || '',
        platform: 'wxapp'
      };
      
      // 调用同步用户API
      const result = await request.post('/api/wxapp/users/sync', syncData);
      console.log('用户同步成功:', result);
      
      // 存储用户信息
      if (result.data) {
        wx.setStorageSync('openid', result.data.openid);
        wx.setStorageSync('userInfo', result.data);
      }
      
      return {
        code: 0,
        data: result.data,
        openid: result.data.openid,
        message: '登录成功'
      };
    } catch (err) {
      console.error('登录失败:', err);
      return {
        code: -1,
        message: '登录失败: ' + (err.message || '未知错误'),
        openid: wx.getStorageSync('openid') || ''
      };
    }
  },
  
  /**
   * 更新用户信息
   * @param {Object} userData - 要更新的用户数据
   * @returns {Promise} - 返回Promise对象
   */
  updateUser: async (userData = {}) => {
    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        throw new Error('用户未登录');
      }
      
      console.log('更新用户信息:', userData);
      
      // 构建更新数据对象
      const updateData = {};
      
      // 只包含需要更新的字段
      if (userData.nickName !== undefined) updateData.nick_name = userData.nickName;
      if (userData.status !== undefined) updateData.bio = userData.status;
      if (userData.avatarUrl !== undefined) updateData.avatar = userData.avatarUrl;
      
      // 调用更新用户API
      const result = await request.put(`/api/wxapp/users/${openid}`, updateData);
      console.log('用户信息更新成功:', result);
      
      // 更新本地存储的用户信息
      if (result.data) {
        const userInfo = wx.getStorageSync('userInfo') || {};
        const newUserInfo = {
          ...userInfo,
          ...result.data
        };
        wx.setStorageSync('userInfo', newUserInfo);
      }
      
      return {
        code: 0,
        success: true,
        message: '更新成功',
        data: result.data
      };
    } catch (err) {
      console.error('更新用户信息失败:', err);
      return {
        code: -1,
        success: false,
        message: '更新失败: ' + (err.message || '未知错误')
      };
    }
  },
  
  /**
   * 获取用户点赞列表
   * @param {Object} params - 请求参数
   * @returns {Promise} - 返回Promise对象
   */
  getUserLikes: async (params = {}) => {
    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        throw new Error('用户未登录');
      }
      
      // 获取统计数据模式
      if (params.countOnly) {
        const result = await request.get(`/api/wxapp/users/likes/count`, { openid });
        return {
          success: true,
          count: result.data.count
        };
      } else {
        // 获取点赞列表模式
        const { page = 1, pageSize = 10 } = params;
        
        const result = await request.get(`/api/wxapp/users/likes`, { 
          openid, 
          page, 
          limit: pageSize 
        });
        
        return {
          success: true,
          likes: result.data.likes,
          total: result.data.total
        };
      }
    } catch (err) {
      console.error('获取用户点赞失败:', err);
      return {
        success: false,
        message: '获取点赞数据失败: ' + (err.message || '未知错误')
      };
    }
  },
  
  /**
   * 获取用户特定帖子的点赞详情
   * @param {string} postId - 帖子ID
   * @returns {Promise} - 返回Promise对象
   */
  getUserLikesDetail: async (postId) => {
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
      
      const result = await request.get(`/api/wxapp/users/likes/detail`, { openid, postId });
      
      return {
        success: true,
        detail: result.data,
        isLiked: result.data && result.data.isLiked
      };
    } catch (err) {
      console.error('获取点赞详情失败:', err);
      return {
        success: false,
        message: '获取点赞详情失败: ' + (err.message || '未知错误')
      };
    }
  },
  
  /**
   * 修复用户点赞数据
   * @param {Object} params - 请求参数
   * @returns {Promise} - 返回Promise对象
   */
  fixUserLikes: async (params = {}) => {
    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        throw new Error('用户未登录');
      }
      
      const result = await request.post(`/api/wxapp/users/likes/fix`, {
        openid,
        fix_type: params.fix_type || 'all'
      });
      
      return {
        success: true,
        result: result.data,
        message: result.message || '修复成功'
      };
    } catch (err) {
      console.error('修复点赞数据失败:', err);
      return {
        success: false,
        message: '修复点赞数据失败: ' + (err.message || '未知错误')
      };
    }
  }
};

// 帖子相关API
const postApi = {
  /**
   * 获取帖子列表
   * @param {Object} params - 请求参数
   * @returns {Promise} - 返回Promise对象
   */
  getPosts: async (params = {}) => {
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
  },
  
  /**
   * 获取帖子详情
   * @param {string} postId - 帖子ID
   * @param {boolean} updateView - 是否更新浏览量
   * @returns {Promise} - 返回Promise对象
   */
  getPostDetail: async (postId, updateView = true) => {
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
  },
  
  /**
   * 获取帖子评论列表
   * @param {string} postId - 帖子ID
   * @param {Object} params - 请求参数
   * @returns {Promise} - 返回Promise对象
   */
  getPostComments: async (postId, params = {}) => {
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
  },
  
  /**
   * 点赞/取消点赞帖子
   * @param {string} postId - 帖子ID
   * @returns {Promise} - 返回Promise对象
   */
  likePost: async (postId) => {
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
};

// 导出API模块
module.exports = {
  user: userApi,
  post: postApi
}; 