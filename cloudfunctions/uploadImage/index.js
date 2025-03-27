// 云函数入口文件 - 图片上传
const cloud = require('wx-server-sdk')

cloud.init({
  env: 'nkuwiki-0g6bkdy9e8455d93'
})

/**
 * 上传图片到云存储
 * @param {string} fileID - 临时文件ID
 * @param {string} prefix - 路径前缀，如 post/、comment/ 等
 */
async function uploadImageToCloud(fileID, prefix = 'common/') {
  try {
    // 下载临时文件
    const tempRes = await cloud.downloadFile({
      fileID
    })
    
    const tempFilePath = tempRes.fileContent
    
    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substr(2, 8)
    const extension = fileID.split('.').pop().toLowerCase()
    const cloudPath = `${prefix}${timestamp}_${randomStr}.${extension}`
    
    // 上传到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath,
      fileContent: tempFilePath
    })
    
    // 获取文件访问链接
    const fileList = [uploadRes.fileID]
    const result = await cloud.getTempFileURL({
      fileList
    })
    
    return {
      fileID: uploadRes.fileID,
      tempFileURL: result.fileList[0].tempFileURL,
      cloudPath
    }
  } catch (err) {
    console.error('上传图片失败:', err)
    throw err
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { fileID, type = 'common' } = event
    
    // 检查参数
    if (!fileID) {
      return {
        code: -1,
        message: '缺少文件ID参数'
      }
    }
    
    // 根据不同类型使用不同的路径前缀
    const prefixMap = {
      'post': 'post/',
      'comment': 'comment/',
      'avatar': 'avatar/',
      'common': 'common/'
    }
    
    const prefix = prefixMap[type] || prefixMap.common
    
    // 上传图片
    const result = await uploadImageToCloud(fileID, prefix)
    
    return {
      code: 0,
      message: '上传成功',
      data: result
    }
  } catch (err) {
    console.error('云函数执行错误:', err)
    return {
      code: -1,
      message: '上传失败: ' + err.message
    }
  }
} 