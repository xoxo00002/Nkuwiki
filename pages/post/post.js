Page({
  data: {
    title: '',
    content: '',
    images: [],
    visibility: 'public',  // 默认公开
    isSubmitting: false,  // 添加提交状态标记
    canSubmit: false,  // 新增一个状态来控制按钮
    contentWarn: ''  // 新增一个状态来存储内容警告
  },

  // 监听标题输入
  onTitleInput(e) {
    const title = e.detail.value;
    this.setData({
      title,
      canSubmit: title.trim() && this.data.content.trim()  // 检查标题和内容是否都有值
    });
  },

  // 监听内容输入
  onContentInput(e) {
    const content = e.detail.value;
    let warn = '';
    // 中文字符通常计为2个字符，所以3800对应约1900个中文字符
    if (content.length > 3800) {
      warn = '即将达到字数上限';
    }
    
    this.setData({
      content,
      contentWarn: warn,
      canSubmit: content.trim() && this.data.title.trim()
    });
  },

  // 选择图片
  async chooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 9 - this.data.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      wx.showLoading({ title: '上传中...' })

      // 上传图片到云存储
      const uploadTasks = res.tempFilePaths.map(filePath => {
        return wx.cloud.uploadFile({
          cloudPath: `posts/${Date.now()}-${Math.random().toString(36).slice(-6)}.jpg`,
          filePath
        })
      })

      const uploadResults = await Promise.all(uploadTasks)
      console.log('图片上传结果：', uploadResults)

      const newImages = uploadResults.map(res => res.fileID)
      console.log('新增图片fileID：', newImages)

      this.setData({
        images: [...this.data.images, ...newImages]
      })

      wx.hideLoading()
    } catch (err) {
      console.error('上传图片失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      })
    }
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset
    wx.previewImage({
      urls: this.data.images,
      current: url
    })
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset
    const images = [...this.data.images]
    images.splice(index, 1)
    this.setData({ images })
  },

  // 切换可见性
  onVisibilityChange(e) {
    this.setData({
      visibility: e.detail.value
    })
  },

  // 发布帖子
  async submitPost() {
    console.log('开始提交帖子...');
    
    const userInfo = wx.getStorageSync('userInfo');
    console.log('获取的用户信息:', userInfo);
    
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    
    try {
      console.log('准备提交数据:', {
        title: this.data.title,
        content: this.data.content,
        images: this.data.images,
        userInfo相关字段: {
          authorId: userInfo._id,
          authorName: userInfo.nickName,
          authorAvatar: userInfo.avatarUrl,
          loginType: userInfo.loginType
        }
      });

      const res = await wx.cloud.callFunction({
        name: 'createPost',
        data: {
          title: this.data.title,
          content: this.data.content,
          images: this.data.images,
          // 添加用户标识信息
          authorId: userInfo._id,
          authorName: userInfo.nickName,
          authorAvatar: userInfo.avatarUrl,
          loginType: userInfo.loginType  // 添加登录类型标识
        }
      });

      console.log('云函数返回结果:', res);

      if (res.result && res.result.code === 0) {
        wx.hideLoading();
        wx.showToast({ title: '发布成功' });
        console.log('帖子创建成功，ID:', res.result.data);
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(res.result?.message || '发布失败，未知错误');
      }
    } catch (err) {
      console.error('发布失败详细信息:', err);
      wx.hideLoading();
      wx.showToast({
        title: '发布失败: ' + (err.message || '未知错误'),
        icon: 'none',
        duration: 2500
      });
    }
  }
}) 