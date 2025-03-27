// app.js
App({
  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'nkuwiki-0g6bkdy9e8455d93',
        traceUser: true
      })
    }

    // 检查登录状态
    this.checkLoginStatus()

    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    } else {
      // 跳转登录页面
      wx.reLaunch({
        url: '/pages/login/login'
      });
    }
  },

  // 微信一键登录
  wxLogin: async function() {
    return new Promise(async (resolve, reject) => {
      try {
        const userApi = require('./utils/api/user');
        console.log('开始调用用户登录API');
        
        // 调用API模块中的login方法，不再使用云函数
        const result = await userApi.login(this.globalData.userInfo || {});
        
        if (result.code === 0) {
          this.globalData.userInfo = result.data;
          console.log('登录成功，用户信息:', result.data);
          resolve(result);
        } else {
          console.error('登录失败:', result.message);
          reject(new Error(result.message || '登录失败'));
        }
      } catch (err) {
        console.error('登录过程发生异常:', err);
        reject(err);
      }
    });
  },

  logout() {
    // 清除所有本地存储
    wx.clearStorageSync();

    // 重定向到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  globalData: {
    config: {
      services: {
        app: {
          base_url: 'https://nkuwiki.com',
          conversation_max_tokens: 100000000,
          expires_in_seconds: 3600
        }
      }
    }
  }
})
