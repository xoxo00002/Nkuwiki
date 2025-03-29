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
    
    // 只包含需要更新的字段，根据API文档映射字段名
    if (userData.nickName !== undefined) updateData.nick_name = userData.nickName;
    if (userData.status !== undefined) updateData.bio = userData.status;
    if (userData.avatarUrl !== undefined) updateData.avatar = userData.avatarUrl;
    if (userData.gender !== undefined) updateData.gender = userData.gender;
    if (userData.country !== undefined) updateData.country = userData.country;
    if (userData.province !== undefined) updateData.province = userData.province;
    if (userData.city !== undefined) updateData.city = userData.city;
    if (userData.language !== undefined) updateData.language = userData.language;
    if (userData.birthday !== undefined) updateData.birthday = userData.birthday;
    if (userData.wechatId !== undefined) updateData.wechatId = userData.wechatId;
    if (userData.qqId !== undefined) updateData.qqId = userData.qqId;
    if (userData.extra !== undefined) updateData.extra = userData.extra;
    
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
    
    // 将openid作为查询参数传递，而不是请求体
    const result = await request.post(`/api/wxapp/users/likes/fix`, {
      fix_type: params.fix_type || 'all'
    }, {}, { openid });
    
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
    
    console.debug('开始上传用户头像:', { openid, filePath });
    
    // 上传文件到微信云存储
    const cloudPath = `avatars/${openid}_${Date.now()}.jpg`;
    
    console.debug('准备上传到云存储路径:', cloudPath);
    
    // 这部分仍使用云函数，因为涉及微信云存储
    let uploadResult;
    try {
      uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });
      console.debug('头像上传云存储成功:', uploadResult);
    } catch (cloudError) {
      console.error('上传头像到云存储失败:', cloudError);
      throw new Error('上传头像到云存储失败: ' + (cloudError.errMsg || '未知错误'));
    }
    
    if (!uploadResult || !uploadResult.fileID) {
      throw new Error('上传头像失败: 未获取到文件ID');
    }
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    console.debug('当前用户信息:', userInfo);
    
    // 调用更新用户API将头像URL更新到用户资料
    console.debug('准备更新用户头像URL:', uploadResult.fileID);
    
    // 构建更新数据对象
    const updateData = {
      avatar: uploadResult.fileID  // 服务器端使用avatar字段
    };
    
    // 调用更新用户API
    const result = await request.put(`/api/wxapp/users/${openid}`, updateData);
    console.debug('更新用户头像成功:', result);
    
    // 更新本地存储的用户信息
    if (result.data) {
      const newUserInfo = {
        ...userInfo,
        avatarUrl: uploadResult.fileID  // 本地使用avatarUrl字段
      };
      wx.setStorageSync('userInfo', newUserInfo);
    }
    
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

/**
 * 获取用户信息
 * @param {Object} params - 请求参数，包含openid
 * @returns {Promise} - 返回Promise对象
 */
async function getUserInfo(params = {}) {
  try {
    // 优先使用传入的openid，否则从存储中获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('未提供openid且未登录');
    }
    
    console.debug('获取用户信息:', { openid });
    
    // 统一使用 /api/wxapp/users/{openid} 接口获取用户信息
    const apiUrl = `/api/wxapp/users/${openid}`;
    
    const result = await request.get(apiUrl);
    
    console.debug('获取用户信息API原始返回:', result);
    
    // 处理API响应
    let userData = null;
    let success = false;
    
    // 适配新API格式 (code=200)
    if (result && result.code === 200 && result.data) {
      userData = result.data;
      success = true;
    } 
    // 兼容旧格式
    else if (result && result.success) {
      userData = result.userInfo || result;
      success = true;
    }
    
    // 如果是当前用户且获取成功，更新本地存储
    if (success && userData && (!params.openid || params.isSelf)) {
      const localUserInfo = {
        ...wx.getStorageSync('userInfo'),
        ...userData,
        openid: userData.openid,
        nickName: userData.nick_name || userData.nickName,
        avatarUrl: userData.avatar || userData.avatarUrl
      };
      wx.setStorageSync('userInfo', localUserInfo);
    }
    
    // 保持与前端组件期望的一致结构返回
    return {
      success: success,
      userInfo: userData,
      message: (result && result.message) || '获取用户信息' + (success ? '成功' : '失败')
    };
  } catch (err) {
    console.error('获取用户信息失败:', err);
    return {
      success: false,
      message: '获取用户信息失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 获取用户交互的帖子（点赞、收藏、评论）
 * @param {Object} params - 请求参数
 * @param {string} params.openid - 用户openid
 * @param {string} params.type - 交互类型：like（点赞）、star/favorite（收藏）、comment（评论）
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise} - 返回Promise对象
 */
async function getUserInteractionPosts(params = {}) {
  try {
    // 优先使用传入的openid，否则从存储中获取
    const openid = params.openid || wx.getStorageSync('openid');
    if (!openid) {
      throw new Error('未提供openid且未登录');
    }
    
    console.debug('获取用户交互帖子:', { openid, type: params.type, params });
    
    // 构建请求参数
    const limit = params.pageSize || 10;
    const offset = ((params.page || 1) - 1) * limit;
    
    // 根据API文档，目前没有直接获取用户交互帖子的接口
    // 最佳方案是使用帖子列表接口并添加过滤条件，或自己维护本地收藏/点赞列表
    // 这里给出一个临时实现
    let result;
    
    switch (params.type) {
      case 'like':
        // 获取用户点赞的帖子，使用帖子列表API
        result = await request.get('/api/wxapp/posts', {
          openid: openid,
          limit: limit,
          offset: offset,
          interaction: 'liked' // 这是假设的参数，API可能不支持
        });
        break;
        
      case 'star':
      case 'favorite':
        // 获取用户收藏的帖子，使用帖子列表API
        result = await request.get('/api/wxapp/posts', {
          openid: openid,
          limit: limit,
          offset: offset,
          interaction: 'favorited' // 这是假设的参数，API可能不支持
        });
        break;
        
      case 'comment':
        // 获取用户评论的帖子，使用评论列表API
        result = await request.get('/api/wxapp/comments', {
          openid: openid,
          limit: limit,
          offset: offset
        });
        
        // 评论结果可能需要额外处理，将评论关联的帖子信息提取出来
        // 这里简化处理，假设评论数据中包含帖子信息
        break;
        
      default:
        throw new Error('未知的交互类型');
    }
    
    console.debug(`获取用户${params.type}帖子结果:`, result);
    
    // 处理结果
    return {
      success: true,
      posts: result.data.posts || [],
      total: result.data.total || 0,
      message: `获取${params.type}列表成功`
    };
  } catch (err) {
    console.error('获取用户交互帖子失败:', err);
    return {
      success: false,
      message: '获取用户交互帖子失败: ' + (err.message || '未知错误') + ' (请联系开发者完善API)'
    };
  }
}

module.exports = {
  login,
  updateUser,
  getUserInfo,
  getUserLikes,
  getUserLikesDetail,
  fixUserLikes,
  uploadUserAvatar,
  getUserInteractionPosts
}; 