// index.js
const app = getApp();
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

let isLiking = false  // 添加在 Page 外部
let isFavoriting = false;  // 防止重复点击收藏按钮

// 在文件顶部引入工具函数和API模块
const util = require('../../utils/util');
const api = require('../../utils/api');

Page({
  data: {
    motto: 'Hello World',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    currentCommentPostId: null,
    currentCommentPostIndex: null,
    showCommentInput: false,
    commentText: '',
    commentImages: [],
    showExpandedEditor: false,
    searchValue: '',
    searchHistory: [],
    searchResults: [],
    currentPage: 1,
    baseUrl: app.globalData.config.services.app.base_url,
  },
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      "userInfo.avatarUrl": avatarUrl,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      "userInfo.nickName": nickName,
      hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
    })
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  onLoad() {
    console.log('页面加载')
    this.loadPosts()
    this.setData({
      currentPostId: '',  // 初始化为空字符串
      currentPostIndex: -1
    })
  },
  onShow() {
    console.log('页面显示')
  },
  // 下拉刷新
  onPullDownRefresh() {
    console.log('触发下拉刷新')

    // 维持页面位置，只刷新数据
    this.loadPosts(true).then(() => {
      wx.stopPullDownRefresh()
    }).catch(() => {
      wx.stopPullDownRefresh()
    })
  },
  // 加载帖子 - 返回Promise以便链式调用
  async loadPosts(refresh = false) {
    if (this.data.loading || (!refresh && !this.data.hasMore)) return Promise.resolve()

    try {
      this.setData({ loading: true })

      // 获取用户OPENID，用于确定点赞状态
      let OPENID = ''
      try {
        // 使用API模块获取用户信息
        const loginResult = await api.user.login()
        OPENID = loginResult.openid || ''
        console.log('首页获取到的OPENID:', OPENID)
      } catch (err) {
        console.error('获取用户OPENID失败：', err)
      }

      // 使用API模块获取帖子列表
      const result = await api.post.getPosts({
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        order_by: 'create_time DESC'
      })

      if (!result || !result.success) {
        throw new Error('获取帖子列表失败')
      }

      const posts = result.posts || []
      console.log('获取到的帖子数量:', posts.length, '刷新模式:', refresh)

      // 添加更多日志来查看问题
      if (posts.length === 0) {
        console.log('没有获取到帖子，检查是否有数据')
      } else {
        console.log('第一条帖子的ID:', posts[0].id)
      }

      // 处理帖子数据，格式化创建时间
      const processedPosts = posts.map(post => {
        // 处理评论预览，确保评论内容中的方括号不会被误解析
        const processedComments = (post.recent_comments || []).map(comment => {
          const hasImage = comment.images && comment.images.length > 0;
          // 安全处理评论内容，防止方括号被错误解析为图片
          let content = comment.content;
          if (content && content.includes('[')) {
            // 替换可能导致问题的方括号文本
            content = content.replace(/\[([^\]]*)\]/g, '「$1」');
          }
          
          return {
            ...comment,
            content,
            hasImage
          };
        });
        
        return {
          ...post,
          _id: post.id,  // 兼容旧代码
          createTime: this.formatTimeDisplay(post.create_time || post.createTime),
          isLiked: OPENID ? post.liked_users?.includes(OPENID) : false,
          isFavorited: OPENID ? post.favorite_users?.includes(OPENID) : false,
          commentCount: post.comment_count || 0,
          likes: post.like_count || 0,
          favoriteCounts: post.favorite_count || 0,
          // 使用处理过的评论预览
          commentPreview: processedComments
        };
      });

      // 更新页面数据
      this.setData({
        posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
        page: refresh ? 2 : this.data.page + 1,
        hasMore: posts.length === this.data.pageSize,
        loading: false
      })

      return Promise.resolve()
    } catch (err) {
      console.error('加载帖子失败：', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      return Promise.reject(err)
    }
  },
  // 添加图片预览功能
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({
      urls,
      current
    })
  },
  // 格式化时间显示
  formatTimeDisplay(dateStr) {
    if (!dateStr) return ''

    try {
      // 兼容iOS的日期格式处理
      let date;
      if (typeof dateStr === 'string') {
        // 检测格式是否为 "yyyy-MM-dd HH:mm:ss"
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
          // 将空格替换为T，使之符合iOS支持的格式 "yyyy-MM-ddTHH:mm:ss"
          dateStr = dateStr.replace(' ', 'T');
        }
        
        // 尝试解析日期
        date = new Date(dateStr);
        
        // 检查日期是否有效
        if (isNaN(date.getTime())) {
          console.error('无效的日期格式:', dateStr);
          return '';
        }
      } else {
        date = new Date(dateStr);
      }
      
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 1000 / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 30) return `${days}天前`

      // 格式化日期输出，确保月份和日期是两位数
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`
    } catch (e) {
      console.error('时间格式化错误：', e)
      return ''
    }
  },
  // 跳转到发帖页面
  goToPost() {
    wx.navigateTo({
      url: '/pages/post/post'
    })
  },
  // 跳转到帖子详情
  goToDetail(e) {
    const { postId } = e.currentTarget.dataset;

    if (!postId) {
      console.error('未找到帖子ID');
      return;
    }

    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },
  // 修改点赞处理函数
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset

    // 防止重复点击
    if (isLiking) return
    isLiking = true

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index]
      if (!currentPost) {
        throw new Error('帖子不存在')
      }

      // 立即更新UI状态，提供即时反馈
      const newIsLiked = !currentPost.isLiked
      const newLikes = currentPost.likes + (newIsLiked ? 1 : -1)

      this.setData({
        [`posts[${index}].isLiked`]: newIsLiked,
        [`posts[${index}].likes`]: newLikes
      })

      // 调用API模块并添加详细日志
      console.log('调用点赞API:', {
        postId: id,
        当前点赞状态: currentPost.isLiked,
        新点赞状态: newIsLiked
      })

      // 使用API模块点赞
      const result = await api.post.likePost(id);

      console.log('点赞API返回结果:', result)

      if (!result || !result.success) {
        // 如果失败，回滚UI状态
        this.setData({
          [`posts[${index}].isLiked`]: currentPost.isLiked,
          [`posts[${index}].likes`]: currentPost.likes
        })
        throw new Error(result?.message || '操作失败')
      }

      // 成功时将openid保存到本地，确保刷新后状态一致
      try {
        // 在本地存储中记录点赞状态
        const likedPosts = wx.getStorageSync('likedPosts') || {}
        if (newIsLiked) {
          likedPosts[id] = true
        } else {
          delete likedPosts[id]
        }
        wx.setStorageSync('likedPosts', likedPosts)
      } catch (err) {
        console.error('保存点赞状态失败:', err)
      }

      // 轻量级提示
      wx.showToast({
        title: newIsLiked ? '已点赞' : '已取消',
        icon: 'none',
        duration: 1000
      })

    } catch (err) {
      console.error('点赞失败:', err)
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    } finally {
      // 无论成功失败，重置操作状态
      isLiking = false
    }
  },
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`posts[${index}].authorAvatar`]: '/assets/icons/default-avatar.png'
    });
    console.log(`头像 ${index} 加载失败，已替换为默认头像`);
  },
  // 显示评论输入框
  showCommentInput(e) {
    const { id, index } = e.currentTarget.dataset;

    console.log("显示评论框，帖子ID:", id, "索引:", index);

    if (!id) {
      wx.showToast({
        title: '无法识别帖子',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showCommentInput: true,
      currentPostId: id,  // 确保这里正确存储了帖子ID
      currentPostIndex: index,
      commentText: '',
      commentImages: []
    });
  },
  // 隐藏评论框
  hideCommentInput() {
    this.setData({
      showCommentInput: false,
      currentPostId: '',  // 重置帖子ID
      currentPostIndex: -1,
      commentText: '',
      commentImages: []
    });
  },
  // 评论输入监听
  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    });
  },
  // 选择评论图片
  chooseCommentImage() {
    const that = this;
    wx.chooseImage({
      count: 9,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths;
        const tempFiles = res.tempFiles;

        const currentImages = that.data.commentImages || [];
        const newImages = tempFilePaths.map((path, index) => ({
          tempUrl: path,
          size: tempFiles[index].size
        }));

        // 确保总数不超过9张
        const totalImages = [...currentImages, ...newImages].slice(0, 9);

        that.setData({
          commentImages: totalImages
        });
      }
    });
  },
  // 移除已选择的评论图片
  removeCommentImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.commentImages;
    images.splice(index, 1);
    this.setData({
      commentImages: images
    });
  },
  // 提交评论
  async submitComment() {
    const postId = this.data.currentPostId;
    console.log("准备提交评论，帖子ID:", postId);

    if (!postId) {
      wx.showToast({
        title: '未找到帖子ID',
        icon: 'none'
      });
      return;
    }

    const content = this.data.commentText.trim();
    const hasImages = this.data.commentImages && this.data.commentImages.length > 0;

    if (!content && !hasImages) {
      wx.showToast({ title: '评论内容不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中...' });

    try {
      // 从本地获取用户信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userName = userInfo.nickName || '用户';
      const userAvatar = userInfo.avatarUrl || '/assets/icons/default-avatar.png';

      // 先上传图片(如果有)
      let imageUrls = [];
      if (hasImages) {
        console.log("开始上传评论图片...");
        const uploadTasks = this.data.commentImages.map(img => this.uploadImage(img.tempUrl));
        imageUrls = await Promise.all(uploadTasks);
        console.log("图片上传成功:", imageUrls);
      }

      // 使用API模块添加评论
      console.log("调用API添加评论...");
      const result = await api.comment.createComment({
        post_id: postId,
        content: content,
        images: imageUrls,
        // 用户信息通过API自动处理
      });

      console.log("评论API返回结果:", result);

      if (result && result.success) {
        console.log("新添加的评论:", result.comment);
        console.log("对比用户信息 - 本地:", userName, "评论中:", result.comment.authorName);

        // 更新本地数据
        let posts = this.data.posts;
        if (!posts[this.data.currentPostIndex].comments) {
          posts[this.data.currentPostIndex].comments = [];
        }

        // 添加新评论
        posts[this.data.currentPostIndex].comments.push(result.comment);

        // 更新评论计数
        if (!posts[this.data.currentPostIndex].commentCount) {
          posts[this.data.currentPostIndex].commentCount = 0;
        }
        posts[this.data.currentPostIndex].commentCount += 1;

        // 更新评论预览
        if (!posts[this.data.currentPostIndex].commentPreview) {
          posts[this.data.currentPostIndex].commentPreview = [];
        }

        // 添加到评论预览（保持最新3条）
        const newComment = {
          ...result.comment,
          hasImage: imageUrls.length > 0
        };

        posts[this.data.currentPostIndex].commentPreview.unshift(newComment);
        if (posts[this.data.currentPostIndex].commentPreview.length > 3) {
          posts[this.data.currentPostIndex].commentPreview = posts[this.data.currentPostIndex].commentPreview.slice(0, 3);
        }

        this.setData({
          posts: posts,
          commentText: '',
          commentImages: [],
          showCommentInput: false
        });

        console.log("评论已添加到本地数据，帖子现在的评论数:", posts[this.data.currentPostIndex].comments.length);

        wx.hideLoading();
        wx.showToast({ title: '评论成功', icon: 'success' });
      } else {
        throw new Error(result?.message || '评论提交失败');
      }
    } catch (err) {
      console.error("评论提交出错:", err);
      wx.hideLoading();
      wx.showToast({
        title: '评论失败: ' + (err.message || '未知错误'),
        icon: 'none',
        duration: 2000
      });
    }
  },
  // 上传图片到云存储
  async uploadImage(tempFilePath) {
    try {
      // 使用API模块上传图片
      const result = await api.upload.uploadImage(tempFilePath);
      return result.fileID;
    } catch (err) {
      console.error('上传图片失败:', err);
      throw err;
    }
  },
  // 获取用户信息
  async getUserInfo() {
    try {
      // 从本地存储获取
      const userInfo = wx.getStorageSync('userInfo');

      // 如果有缓存数据，返回缓存的用户信息
      if (userInfo && userInfo._id) {
        console.log("从缓存获取到用户信息:", userInfo.nickName);
        return userInfo;
      }

      console.log("缓存中无用户信息，尝试登录");

      // 使用API模块登录获取用户信息
      const loginResult = await api.user.login();
      
      if (loginResult.code === 0 && loginResult.data) {
        console.log("登录获取到用户信息:", loginResult.data.nickName);
        return loginResult.data;
      }

      console.log("未查询到用户信息");
      return {};
    } catch (err) {
      console.error('获取用户信息失败:', err);
      return {};
    }
  },
  // 添加查看全部评论跳转功能
  viewPostDetail(e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/post/detail/detail?id=${postId}`
    });
  },
  // 显示扩展编辑区
  showExpandedEditor() {
    this.setData({
      showExpandedEditor: true
    });
  },
  // 隐藏扩展编辑区
  hideExpandedEditor() {
    this.setData({
      showExpandedEditor: false
    });
  },
  // 确认评论内容
  confirmComment() {
    // 隐藏扩展编辑区并提交评论
    this.setData({
      showExpandedEditor: false
    });
    this.submitComment();
  },

  // 添加收藏处理函数
  async handleFavorite(e) {
    const { id, index } = e.currentTarget.dataset

    // 防止重复点击
    if (this.data.isFavoriting) return
    this.setData({ isFavoriting: true })

    try {
      // 获取当前帖子状态
      const currentPost = this.data.posts[index]
      if (!currentPost) {
        throw new Error('帖子不存在')
      }

      // 立即更新UI状态
      const newIsFavorited = !currentPost.isFavorited
      const newFavouriteCounts = currentPost.favoriteCounts + (newIsFavorited ? 1 : -1);

      this.setData({
        [`posts[${index}].isFavorited`]: newIsFavorited,
        [`posts[${index}].favoriteCounts`]: newFavouriteCounts
      });

      // 使用API模块收藏/取消收藏
      console.log('调用收藏API:', {
        postId: id,
        当前收藏状态: currentPost.isFavorited
      });

      // 根据操作类型调用不同的API
      const result = newIsFavorited 
        ? await api.post.favoritePost(id)
        : await api.post.unfavoritePost(id);

      console.log('收藏API返回结果:', result)

      if (!result || !result.success) {
        // 如果失败，回滚UI状态
        this.setData({
          [`posts[${index}].isFavorited`]: currentPost.isFavorited,
          [`posts[${index}].favoriteCounts`]: currentPost.favoriteCounts
        })
        throw new Error(result?.message || '操作失败')
      }

      // 成功时将状态保存到本地
      const favoritePosts = wx.getStorageSync('favoritePosts') || {}

      if (newIsFavorited) {
        favoritePosts[id] = true
      } else {
        delete favoritePosts[id]
      }
      wx.setStorageSync('favoritePosts', favoritePosts)

      // 轻量级提示
      wx.showToast({
        title: newIsFavorited ? '已收藏' : '已取消收藏',
        icon: 'none',
        duration: 1000
      })

    } catch (err) {
      console.error('收藏操作失败:', err)
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    } finally {
      // 解除标志
      this.setData({ isFavoriting: false })
    }
  }
})
