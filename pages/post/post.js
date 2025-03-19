Page({
  data: {
    title: '',
    content: '',
    images: [],
    tempImages: [],
    showImagePreview: false,
    currentPreviewIndex: 0,
    isWikiEnabled: false,
    isPublic: true,
    allowComment: true,
    wikiKnowledge: false,
    currentStyle: 'formal',
    previewImages: [],
    imageSize: {
      maxWidth: 1080, // 最大宽度
      maxHeight: 1080, // 最大高度
      quality: 0.8 // 压缩质量
    },
    isEditingMode: false
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

  // Wiki润色开关
  toggleWiki() {
    this.setData({
      isWikiEnabled: !this.data.isWikiEnabled
    });
  },

  // 文风选择
  selectStyle(e) {
    this.setData({
      currentStyle: e.currentTarget.dataset.style
    });
  },

  // 公开设置
  togglePublic() {
    this.setData({
      isPublic: !this.data.isPublic
    });
  },

  // 评论设置
  toggleComment() {
    this.setData({
      allowComment: !this.data.allowComment
    });
  },

  // Wiki小知开关
  toggleWikiKnowledge(e) {
    this.setData({
      wikiKnowledge: e.detail.value
    });
  },

  // 选择图片
  showImagePicker: function() {
    const that = this;
    const remainCount = 9 - this.data.images.length;
    
    if (remainCount <= 0) {
      wx.showToast({
        title: '最多只能上传9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: function(res) {
        const tempFiles = res.tempFiles;
        const tempPaths = tempFiles.map(file => file.tempFilePath);
        
        // 打开预览并裁剪
        that.setData({
          previewImages: tempPaths,
          showImagePreview: true,
          currentPreviewIndex: 0,
          isEditingMode: false  
        });
      }
    });
  },

  // 切换预览图片
  switchPreviewImage: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentPreviewIndex: index
    });
  },

  // 轮播图变化
  swiperChange: function(e) {
    this.setData({
      currentPreviewIndex: e.detail.current
    });
  },

  // 关闭预览
  closePreview: function() {
    this.setData({
      showImagePreview: false,
      previewImages: []
    });
  },

  // 裁剪当前图片
  cropCurrentImage: function() {
    const that = this;
    const index = this.data.currentPreviewIndex;
    const imageSrc = this.data.previewImages[index];
    
    wx.editImage({
      src: imageSrc,
      success(res) {
        // 更新裁剪后的图片
        const newPreviewImages = [...that.data.previewImages];
        newPreviewImages[index] = res.tempFilePath;
        
        that.setData({
          previewImages: newPreviewImages
        });
      }
    });
  },

  // 确认预览的图片
  confirmPreview: function() {
    if (this.data.isEditingMode) {
      // 直接用预览图片替换原有图片
      this.setData({
        images: [...this.data.previewImages],
        showImagePreview: false,
        previewImages: [],
        isEditingMode: false
      });
    } else {
      // 将预览图片添加到现有图片
      const currentImages = this.data.images || [];
      const newImages = [...currentImages, ...this.data.previewImages];
      
      this.setData({
        images: newImages,
        showImagePreview: false,
        previewImages: [],
        isEditingMode: false
      });
    }
  },

  // 批量编辑图片
  batchEditImages: function() {
    // 打开预览并允许编辑
    this.setData({
      previewImages: [...this.data.images],
      showImagePreview: true,
      currentPreviewIndex: 0,
      isEditingMode: true  // 标记为编辑
    });
  },

  // 预览已上传图片
  previewImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    
    this.setData({
      images: images
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 修改发帖函数，在提交前处理图片
  submitPost: function() {
    const that = this;
    const { title, content, images } = this.data;
    
    // 验证输入
    if (!title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return;
    }
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载中
    wx.showLoading({
      title: '正在处理图片...',
      mask: true
    });
    
    // 如果有图片，先处理图片
    if (images.length > 0) {
      this.processImages(images, 0, [], function(processedImages) {
        // 处理完成后发布帖子
        that.doSubmitPost(title, content, processedImages);
      });
    } else {
      // 没有图片，直接发布
      this.doSubmitPost(title, content, []);
      wx.hideLoading();
    }
  },

  // 处理图片（裁剪、压缩）
  processImages: function(images, index, results, callback) {
    const that = this;
    
    if (index >= images.length) {
      // 所有图片处理完成
      wx.hideLoading();
      callback(results);
      return;
    }
    
    // 压缩图片
    wx.compressImage({
      src: images[index],
      quality: that.data.imageSize.quality * 100, // 转为0-100的值
      success(compressRes) {
        results.push(compressRes.tempFilePath);
        // 处理下一张
        that.processImages(images, index + 1, results, callback);
      },
      fail() {
        // 压缩失败，使用原图
        results.push(images[index]);
        that.processImages(images, index + 1, results, callback);
      }
    });
  },

  // 执行发帖请求
  doSubmitPost: function(title, content, processedImages) {
    wx.showLoading({
      title: '发布中...',
      mask: true
    });
    
    // 准备要发送到云函数的数据
    const postData = {
      title: title,
      content: content,
      images: processedImages,
      isPublic: this.data.isPublic
    };
    
    // 调用现有的云函数发布帖子
    wx.cloud.callFunction({
      name: 'createPost', 
      data: postData,
      success: res => {
        wx.hideLoading();
        if (res.result && res.result.code === 0) {
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            success: function() {
              // 延迟返回上一页
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        } else {
          wx.showToast({
            title: res.result ? res.result.message : '发布失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('发布失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '发布失败，请稍后重试',
          icon: 'none'
        });
      }
    });
  },

  onLoad: function() {
    this.setData({
      title: '',
      content: '',
      images: [],
      tempImages: [],
      showImagePreview: false,
      currentPreviewIndex: 0,
      isWikiEnabled: false,
      isPublic: true,
      allowComment: true,
      wikiKnowledge: false,
      currentStyle: 'formal',
      isEditingMode: false
    });
  }
}) 
