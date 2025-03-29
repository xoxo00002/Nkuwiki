/**
 * 上传相关API封装
 */

const request = require('../request');

/**
 * 上传图片到云存储
 * @param {string} filePath - 临时文件路径
 * @param {string} cloudPath - 云存储路径
 * @returns {Promise} - 返回Promise对象
 */
function uploadImage(filePath, cloudPath) {
  return new Promise((resolve, reject) => {
    // 调用云函数，上传文件到云存储
    wx.cloud.uploadFile({
      cloudPath: cloudPath || `images/${Date.now()}-${Math.floor(Math.random() * 10000)}.${filePath.match(/\.([^\.]+)$/)[1]}`,
      filePath: filePath,
      success: res => {
        console.debug('上传图片成功:', res);
        resolve({
          success: true,
          fileID: res.fileID,
          cloudPath: cloudPath,
          message: '上传成功'
        });
      },
      fail: err => {
        console.error('上传图片失败:', err);
        reject({
          success: false,
          message: '上传失败: ' + (err.errMsg || '未知错误')
        });
      }
    });
  });
}

/**
 * 批量上传图片到云存储
 * @param {Array<string>} filePaths - 临时文件路径数组
 * @param {string} cloudPathPrefix - 云存储路径前缀
 * @returns {Promise} - 返回Promise对象
 */
async function uploadImages(filePaths, cloudPathPrefix = 'images') {
  if (!filePaths || !filePaths.length) {
    return {
      success: false,
      message: '没有要上传的图片'
    };
  }

  try {
    const uploadPromises = filePaths.map((filePath, index) => {
      const ext = filePath.match(/\.([^\.]+)$/)[1] || 'png';
      const cloudPath = `${cloudPathPrefix}/${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}.${ext}`;
      return uploadImage(filePath, cloudPath);
    });

    const results = await Promise.all(uploadPromises);
    return {
      success: true,
      fileIDs: results.map(r => r.fileID),
      message: '批量上传成功'
    };
  } catch (err) {
    console.error('批量上传图片失败:', err);
    return {
      success: false,
      message: '批量上传失败: ' + (err.message || '未知错误')
    };
  }
}

/**
 * 上传文件到服务器
 * @param {string} filePath - 临时文件路径
 * @param {string} type - 文件类型，如avatar, post_image
 * @returns {Promise} - 返回Promise对象
 */
function uploadFileToServer(filePath, type = 'attachment') {
  return new Promise((resolve, reject) => {
    const openid = wx.getStorageSync('openid');
    if (!openid) {
      reject({
        success: false,
        message: '用户未登录'
      });
      return;
    }

    // 获取服务器上传token
    request.get('/api/wxapp/upload/token', { openid }).then(tokenRes => {
      const uploadToken = tokenRes.data.token;
      
      // 上传文件到服务器
      wx.uploadFile({
        url: 'https://nkuwiki.com/api/wxapp/upload',
        filePath,
        name: 'file',
        formData: {
          type,
          token: uploadToken
        },
        header: {
          'X-User-OpenID': openid
        },
        success: res => {
          try {
            const result = JSON.parse(res.data);
            if (result.success) {
              resolve({
                success: true,
                url: result.url,
                fileID: result.fileID,
                message: '上传成功'
              });
            } else {
              reject({
                success: false,
                message: result.message || '上传失败'
              });
            }
          } catch (error) {
            reject({
              success: false,
              message: '解析上传结果失败: ' + error.message
            });
          }
        },
        fail: err => {
          console.error('上传文件失败:', err);
          reject({
            success: false,
            message: '上传失败: ' + (err.errMsg || '未知错误')
          });
        }
      });
    }).catch(err => {
      console.error('获取上传token失败:', err);
      reject({
        success: false,
        message: '获取上传token失败: ' + (err.message || '未知错误')
      });
    });
  });
}

/**
 * 批量上传文件到服务器
 * @param {Array<string>} filePaths - 临时文件路径数组
 * @param {string} type - 文件类型，如avatar, post_image
 * @returns {Promise} - 返回Promise对象
 */
async function uploadFilesToServer(filePaths, type = 'attachment') {
  if (!filePaths || !filePaths.length) {
    return {
      success: false,
      message: '没有要上传的文件'
    };
  }

  try {
    const uploadPromises = filePaths.map(filePath => {
      return uploadFileToServer(filePath, type);
    });

    const results = await Promise.all(uploadPromises);
    return {
      success: true,
      urls: results.map(r => r.url),
      fileIDs: results.map(r => r.fileID),
      message: '批量上传成功'
    };
  } catch (err) {
    console.error('批量上传文件失败:', err);
    return {
      success: false,
      message: '批量上传失败: ' + (err.message || '未知错误')
    };
  }
}

module.exports = {
  uploadImage,
  uploadImages,
  uploadFileToServer,
  uploadFilesToServer
}; 