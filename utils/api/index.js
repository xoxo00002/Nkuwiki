/**
 * API模块入口文件
 * 整合所有API模块并导出
 */

const user = require('./user');
const post = require('./post');
const comment = require('./comment');
const upload = require('./upload');
const category = require('./category');

// 导出所有API模块
module.exports = {
  user,     // 用户相关API
  post,     // 帖子相关API
  comment,  // 评论相关API
  upload,   // 上传相关API
  category  // 分类和标签相关API
}; 