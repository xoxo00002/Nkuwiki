# API 调用指南

## 介绍

本文档提供了如何将原先使用云函数的代码改为使用 `api.js` 客户端 API 的示例。由于微信云函数有 3 秒超时限制，我们将功能迁移到了客户端，通过直接调用后端 API 来实现。

## 安装说明

1. 确保 `utils` 目录下已经包含了以下文件:
   - `request.js` - HTTP 请求封装
   - `api.js` - API 接口封装

## 使用示例

### 原先使用云函数的代码

```javascript
// 原先使用云函数的登录代码
onLogin() {
  wx.showLoading({ title: '登录中...' });
  
  wx.cloud.callFunction({
    name: 'login',
    data: {
      nickName: this.data.userInfo.nickName,
      avatarUrl: this.data.userInfo.avatarUrl
    }
  }).then(res => {
    console.log('登录成功:', res.result);
    
    if (res.result.code === 0) {
      // 存储用户信息
      wx.setStorageSync('openid', res.result.openid);
      wx.setStorageSync('userInfo', res.result.data);
      
      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    }
  }).catch(err => {
    console.error('登录失败:', err);
    wx.hideLoading();
    wx.showToast({
      title: '登录失败',
      icon: 'none'
    });
  });
}

// 原先使用云函数获取帖子
loadPosts() {
  wx.showLoading({ title: '加载中...' });
  
  wx.cloud.callFunction({
    name: 'getPosts',
    data: {
      page: this.data.page,
      pageSize: this.data.pageSize,
      category_id: this.data.categoryId
    }
  }).then(res => {
    console.log('获取帖子成功:', res.result);
    
    if (res.result.success) {
      this.setData({
        posts: [...this.data.posts, ...res.result.posts],
        hasMore: this.data.posts.length < res.result.total
      });
    }
    
    wx.hideLoading();
  }).catch(err => {
    console.error('加载帖子失败:', err);
    wx.hideLoading();
    wx.showToast({
      title: '加载失败',
      icon: 'none'
    });
  });
}

// 原先使用云函数更新用户
saveUserInfo() {
  wx.showLoading({ title: '保存中...' });
  
  wx.cloud.callFunction({
    name: 'updateUser',
    data: {
      nickName: this.data.nickName,
      status: this.data.status
    }
  }).then(res => {
    console.log('更新成功:', res.result);
    
    if (res.result.success) {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 更新本地数据
      let userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickName = this.data.nickName;
      userInfo.status = this.data.status;
      wx.setStorageSync('userInfo', userInfo);
    }
  }).catch(err => {
    console.error('保存失败:', err);
    wx.hideLoading();
    wx.showToast({
      title: '保存失败',
      icon: 'none'
    });
  });
}
```

### 改用 api.js 的代码

```javascript
// 导入API模块
const api = require('../../utils/api/index');

// 使用 api.js 的登录代码
async onLogin() {
  wx.showLoading({ title: '登录中...' });
  
  try {
    const result = await api.user.login({
      nickName: this.data.userInfo.nickName,
      avatarUrl: this.data.userInfo.avatarUrl
    });
    
    console.log('登录成功:', result);
    
    if (result.code === 0) {
      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    }
  } catch (err) {
    console.error('登录失败:', err);
    wx.hideLoading();
    wx.showToast({
      title: '登录失败',
      icon: 'none'
    });
  }
}

// 使用 api.js 获取帖子
async loadPosts() {
  wx.showLoading({ title: '加载中...' });
  
  try {
    const result = await api.post.getPosts({
      page: this.data.page,
      pageSize: this.data.pageSize,
      category_id: this.data.categoryId
    });
    
    console.log('获取帖子成功:', result);
    
    if (result.success) {
      this.setData({
        posts: [...this.data.posts, ...result.posts],
        hasMore: this.data.posts.length < result.total
      });
    }
    
    wx.hideLoading();
  } catch (err) {
    console.error('加载帖子失败:', err);
    wx.hideLoading();
    wx.showToast({
      title: '加载失败',
      icon: 'none'
    });
  }
}

// 使用 api.js 更新用户
async saveUserInfo() {
  wx.showLoading({ title: '保存中...' });
  
  try {
    const result = await api.user.updateUser({
      nickName: this.data.nickName,
      status: this.data.status
    });
    
    console.log('更新成功:', result);
    
    if (result.success) {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 本地存储已在API中自动更新
    }
  } catch (err) {
    console.error('保存失败:', err);
    wx.hideLoading();
    wx.showToast({
      title: '保存失败',
      icon: 'none'
    });
  }
}
```

## 完整API列表

### 用户相关API

- `api.user.login(userData)` - 用户登录/同步
- `api.user.updateUser(userData)` - 更新用户信息
- `api.user.getUserLikes(params)` - 获取用户点赞列表
- `api.user.getUserLikesDetail(postId)` - 获取用户特定帖子的点赞详情
- `api.user.fixUserLikes(params)` - 修复用户点赞数据

### 帖子相关API

- `api.post.getPosts(params)` - 获取帖子列表
- `api.post.getPostDetail(postId, updateView)` - 获取帖子详情
- `api.post.getPostComments(postId, params)` - 获取帖子评论列表
- `api.post.likePost(postId)` - 点赞/取消点赞帖子

## 注意事项

1. 直接API调用不受云函数3秒超时限制，但可能受网络状况影响
2. 请确保处理好异常情况
3. 使用 `async/await` 或 `Promise` 处理异步请求
4. 自动会在请求头中添加 `X-User-OpenID` 字段用于后端身份验证 