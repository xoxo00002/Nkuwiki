// pages/profile/edit/edit.js
const api = require('../../../utils/api/index');

Page({
  data: {
    userInfo: null,
    newNickName: '',  // 用于存储修改后的昵称
    newStatus: ''     // 用于存储修改后的个性签名
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    // 初始化时，将现有信息填入输入框
    this.setData({ 
      userInfo,
      newNickName: userInfo.nickName || '',  // 显示现有昵称
      newStatus: userInfo.status || ''        // 显示现有个性签名
    })
  },

  // 微信用户的头像选择处理
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.updateAvatar(avatarUrl)
  },

  // 邮箱用户的头像选择处理
  async onChooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths && res.tempFilePaths[0]) {
        this.updateAvatar(res.tempFilePaths[0])
      }
    } catch (err) {
      console.error('选择图片失败:', err)
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  },

  // 统一的头像更新处理
  async updateAvatar(avatarUrl) {
    wx.showLoading({ title: '更新中...' });
    
    try {
      // 检查用户是否登录
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        throw new Error('用户未登录');
      }

      console.debug('开始上传用户头像:', avatarUrl);
      
      // 1. 直接上传文件到微信云存储
      const cloudPath = `avatars/${openid}_${Date.now()}.jpg`;
      console.debug('准备上传到云存储路径:', cloudPath);
      
      let uploadResult;
      try {
        uploadResult = await wx.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl
        });
        console.debug('头像上传云存储成功:', uploadResult);
      } catch (cloudError) {
        console.error('上传头像到云存储失败:', cloudError);
        throw new Error('上传头像到云存储失败: ' + (cloudError.errMsg || '未知错误'));
      }
      
      if (!uploadResult || !uploadResult.fileID) {
        throw new Error('上传头像失败: 未获取到文件ID');
      }

      // 2. 调用API更新用户信息
      const updateData = {
        avatarUrl: uploadResult.fileID // 服务器使用avatar字段
      };
      
      console.debug('准备调用API更新用户头像URL:', updateData);
      const result = await api.user.updateUser(updateData);
      
      if (!result.success) {
        throw new Error(result.message || '更新用户信息失败');
      }
      
      console.debug('用户头像更新成功');

      // 3. 更新本地存储和页面数据
      const userInfo = this.data.userInfo;
      userInfo.avatarUrl = uploadResult.fileID;
      wx.setStorageSync('userInfo', userInfo);
      this.setData({ userInfo });

      wx.hideLoading();
      wx.showToast({
        title: '更新成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('更新头像失败:', err);
      wx.hideLoading();
      wx.showToast({
        title: '更新失败: ' + (err.message || '未知错误'),
        icon: 'none'
      });
    }
  },

  // 处理昵称输入
  onInputNickName(e) {
    this.setData({
      newNickName: e.detail.value
    })
  },

  // 处理个性签名输入
  onInputStatus(e) {
    this.setData({
      newStatus: e.detail.value
    })
  },

  // 保存修改
  async saveChanges() {
    wx.showLoading({ title: '保存中...' });
    
    try {
      // 构建更新数据，只包含已修改的字段
      const updateData = {};
      
      // 只有当内容真正发生变化时才更新
      if (this.data.newNickName !== this.data.userInfo.nickName) {
        updateData.nickName = this.data.newNickName;
      }

      if (this.data.newStatus !== this.data.userInfo.status) {
        updateData.status = this.data.newStatus;
      }

      // 如果没有任何字段需要更新，直接返回
      if (Object.keys(updateData).length === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '未做任何修改',
          icon: 'none'
        });
        return;
      }

      console.debug('准备向服务器发送用户信息更新请求:', updateData);
      
      // 使用API模块更新用户信息
      const result = await api.user.updateUser(updateData);

      wx.hideLoading();
      
      if (result.success) {
        // 更新本地存储中已修改的字段
        const userInfo = this.data.userInfo;
        if (updateData.nickName) userInfo.nickName = updateData.nickName;
        if (updateData.status) userInfo.status = updateData.status;
        wx.setStorageSync('userInfo', userInfo);

        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(result.message || '保存失败');
      }
    } catch (err) {
      console.error('保存失败：', err);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败: ' + (err.message || '未知错误'),
        icon: 'none'
      });
    }
  }
})