Page({
  data: {
    userInfo: {
      nickname: '北极熊',
      university: '南开大学',
      status: '卷又卷不动，躺又躺不平',
      stats: {
        posts: 238,
        likes: 1459,
        following: 328,
        followers: 892,
        tokens: 50000
      }
    }
  },
  
  onLoad: function() {
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo: function() {
    // TODO: 调用API获取用户信息
  },

  // 编辑资料
  onEditProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/edit/edit'
    });
  },

  // 设置
  onSettings: function() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 功能项点击处理
  onFunctionTap: function(e) {
    const type = e.currentTarget.dataset.type;
    const routes = {
      'star': '/pages/collection/collection',
      'history': '/pages/history/history',
      'comment': '/pages/comments/comments',
      'like': '/pages/likes/likes',
      'draft': '/pages/drafts/drafts',
      'feedback': '/pages/profile/feedback/feedback'
    };
    
    if (routes[type]) {
      wx.navigateTo({
        url: routes[type]
      });
    }
  },

  // 清除缓存
  clearCache: function() {
    // 添加确认弹窗
    wx.showModal({
      title: '确认清除缓存',
      content: '确定要清除缓存吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户点击确定，开始清除缓存
          wx.showLoading({
            title: '清理中...'
          });

          // 获取所有缓存数据的键
          wx.getStorageInfo({
            success: (res) => {
              const size = res.currentSize;
              const keys = res.keys;
              
              // 需要保留的键名列表
              const keepKeys = ['userInfo', 'token', 'important_settings'];
              
              // 过滤出需要删除的键
              const keysToDelete = keys.filter(key => !keepKeys.includes(key));
              
              // 删除非保留数据
              Promise.all(keysToDelete.map(key => {
                return new Promise((resolve, reject) => {
                  wx.removeStorage({
                    key: key,
                    success: resolve,
                    fail: reject
                  });
                });
              }))
              .then(() => {
                wx.hideLoading();
                wx.showToast({
                  title: '清除成功',
                  icon: 'success',
                  duration: 2000
                });
              })
              .catch((err) => {
                wx.hideLoading();
                wx.showToast({
                  title: '清除失败',
                  icon: 'error',
                  duration: 2000
                });
                console.error('清除缓存失败：', err);
              });
            },
            fail: (err) => {
              wx.hideLoading();
              wx.showToast({
                title: '获取缓存信息失败',
                icon: 'error',
                duration: 2000
              });
              console.error('获取缓存信息失败：', err);
            }
          });
        }
        // 用户点击取消则不执行任何操作
      }
    });
  },

  // 添加关于我们点击处理
  onAboutTap: function() {
    wx.navigateTo({
      url: '/pages/profile/about/about'
    });
  }
}) 