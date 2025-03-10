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
    
    // 测试时间格式化
    this.testTimeFormat()
    
    // 测试时间
    this.testTime()
  },

  checkLoginStatus: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    } else {
      // 跳转登录页面
      wx.redirectTo({
        url: '/pages/login/login'
      });
    }
  },

  // 微信一键登录
  wxLogin: async function() {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'login',
        success: res => {
          if (res.result.code === 0) {
            this.globalData.userInfo = res.result.data;
            resolve(res.result);
          } else {
            reject(new Error(res.result.message || '登录失败'));
          }
        },
        fail: err => {
          console.error('登录失败：', err);
          reject(err);
        }
      });
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
    userInfo: null,
    openid: null
  },

  testTimeFormat: function() {
    const util = require('./utils/util');
    
    // 测试各种可能的时间格式
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log("时间格式测试:");
    console.log("现在:", util.formatRelativeTime(now));
    console.log("数字时间戳:", util.formatRelativeTime(now.getTime()));
    console.log("字符串时间戳:", util.formatRelativeTime(now.getTime().toString()));
    console.log("ISO字符串:", util.formatRelativeTime(now.toISOString()));
    console.log("昨天:", util.formatRelativeTime(yesterday));
    console.log("上周:", util.formatRelativeTime(lastWeek));
    console.log("上月:", util.formatRelativeTime(lastMonth));
    
    // 测试数据库中实际使用的格式
    const db = wx.cloud.database();
    db.collection('posts').limit(1).get().then(res => {
      if (res.data && res.data.length > 0) {
        const post = res.data[0];
        console.log("数据库帖子时间原始值:", post.createTime);
        console.log("格式化后:", util.formatRelativeTime(post.createTime));
      }
    }).catch(err => {
      console.error("获取帖子时间测试失败:", err);
    });
  },

  testTime: function() {
    // 测试系统时间是否正确
    const now = new Date();
    console.log('系统当前时间:', now.toLocaleString());
    
    // 测试不同格式时间解析
    const testDates = [
      now,
      now.toISOString(),
      now.getTime(),
      now.toString()
    ];
    
    console.log('==== 时间解析测试 ====');
    testDates.forEach((date, i) => {
      try {
        const parsed = new Date(date);
        console.log(`测试${i+1} - 原始值:`, date);
        console.log(`测试${i+1} - 解析结果:`, parsed.toLocaleString());
        console.log(`测试${i+1} - 是否有效:`, !isNaN(parsed.getTime()));
      } catch (e) {
        console.error(`测试${i+1}解析失败:`, e);
      }
    });
  }
})
