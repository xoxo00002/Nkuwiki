/**
 * 用户相关API封装
 */

const request = require('../request');

/**
 * 用户登录/同步
 * @param {Object} userData - 用户数据
 * @returns {Promise} - 返回Promise对象
 */
async function login(userData = {}) {
  try {
    console.log('开始登录/同步用户:', userData);
    
    // 先尝试从本地获取openid
    let openid = wx.getStorageSync('openid');
    console.log('本地存储的openid:', openid);
    
    // 如果没有openid，直接调用getOpenID云函数
    if (!openid) {
      try {
        console.log('本地无openid，准备调用getOpenID云函数');
        // 确保云环境已初始化
        if (!wx.cloud) {
          throw new Error('云开发环境未正确加载');
        }
        
        // 尝试调用云函数获取openid
        const wxCloudResult = await wx.cloud.callFunction({
          name: 'getOpenID'  // 这个云函数直接返回用户openid，不需要参数
        });
        
        console.log('getOpenID云函数调用结果:', wxCloudResult);
        
        if (wxCloudResult && wxCloudResult.result) {
          // 检查code字段确认请求成功
          if (wxCloudResult.result.code === 0 && wxCloudResult.result.data && wxCloudResult.result.data.openid) {
            openid = wxCloudResult.result.data.openid;
            wx.setStorageSync('openid', openid);
            console.log('成功获取openid:', openid);
          } else {
            console.error('getOpenID返回数据格式不正确或code非0:', wxCloudResult.result);
          }
        } else {
          console.error('getOpenID返回数据格式不正确:', wxCloudResult);
        }
      } catch (cloudError) {
        console.error('调用getOpenID云函数失败:', cloudError);
      }
    }
    
    // 如果仍然没有openid，返回错误
    if (!openid) {
      return {
        code: -1,
        message: '登录失败: 无法获取用户标识',
        openid: ''
      };
    }
    
    // 准备用户数据
    const syncData = {
      openid: openid,  // 使用获取到的openid
      unionid: userData.unionid || '',
      nick_name: userData.nickName || '',
      avatar: userData.avatarUrl || '',
      platform: 'wxapp'
    };
    
    console.log('开始同步用户数据:', syncData);
    
    // 调用同步用户API
    const result = await request.post('/api/wxapp/users/sync', syncData);
    console.log('用户同步成功, 结果:', result);
    
    // 存储用户信息
    if (result.data) {
      wx.setStorageSync('userInfo', result.data);
      console.log('用户信息已存储到本地');
    }
    
    return {
      code: 0,
      data: result.data,
      openid: openid,
      message: '登录成功'
    };
  } catch (err) {
    console.error('登录流程出现异常:', err);
    return {
      code: -1,
      message: '登录失败: ' + (err.message || '未知错误'),
      openid: wx.getStorageSync('openid') || ''
    };
  }
}

/**
 * 更新用户信息
 * @param {Object} userData - 要更新的用户数据
 * @returns {Promise} - 返回Promise对象
 */
async function updateUser(userData = {}) {
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
}

/**
 * 获取用户点赞列表
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function getUserLikes(params = {}) {
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
}

/**
 * 获取用户特定帖子的点赞详情
 * @param {string} postId - 帖子ID
 * @returns {Promise} - 返回Promise对象
 */
async function getUserLikesDetail(postId) {
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
}

/**
 * 修复用户点赞数据
 * @param {Object} params - 请求参数
 * @returns {Promise} - 返回Promise对象
 */
async function fixUserLikes(params = {}) {
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

/**
 * 上传用户头像（仍需保留云函数处理）
 * @param {string} filePath - 临时文件路径
 * @returns {Promise} - 返回Promise对象
 */
async function uploadUserAvatar(filePath) {
  try {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('用户未登录');
    }
    
    if (!filePath) {
      throw new Error('文件路径不能为空');
    }
    
    // 上传文件到微信云存储
    const cloudPath = `avatars/${openid}_${Date.now()}.jpg`;
    
    // 这部分仍使用云函数，因为涉及微信云存储
    const uploadResult = await wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        return res;
      },
      fail: err => {
        console.error('上传头像失败:', err);
        throw err;
      }
    });
    
    if (!uploadResult.fileID) {
      throw new Error('上传头像失败');
    }
    
    // 调用更新用户API将头像URL更新到用户资料
    const result = await updateUser({
      avatarUrl: uploadResult.fileID
    });
    
    return {
      success: true,
      fileID: uploadResult.fileID,
      message: '头像上传成功'
    };
  } catch (err) {
    console.error('上传头像失败:', err);
    return {
      success: false,
      message: '上传头像失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  login,
  updateUser,
  getUserLikes,
  getUserLikesDetail,
  fixUserLikes,
  uploadUserAvatar
}; 