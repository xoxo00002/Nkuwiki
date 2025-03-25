// 引入API模块
const api = require('../../utils/api/index');

Page({
  data: {
    posts: [],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad() {
    this.loadPosts()
  },

  // 页面显示时刷新帖子
  onShow: function() {
    this.loadPosts()
  },

  // 处理下拉刷新
  async onPullDownRefresh() {
    try {
      this.setData({
        page: 1,
        hasMore: true
      })
      await this.loadPosts(true)
      wx.stopPullDownRefresh()
    } catch (err) {
      console.error('刷新失败：', err)
      wx.stopPullDownRefresh()
    }
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading || (!refresh && !this.data.hasMore)) return

    try {
      this.setData({ loading: true })

      // 使用API模块获取帖子列表
      const result = await api.post.getPosts({
        page: refresh ? 1 : this.data.page,
        pageSize: this.data.pageSize,
        order_by: 'create_time DESC'
      });

      if (!result || !result.success) {
        throw new Error('获取帖子列表失败')
      }

      const posts = result.posts || []
      console.log('发现页获取到的帖子数量:', posts.length)

      // 处理帖子数据
      const processedPosts = posts.map(post => {
        return {
          ...post,
          _id: post.id,  // 兼容旧代码
          createTime: post.create_time,
          isLiked: post.liked_users?.includes(this.data.userInfo?.openid || '') || false,
          isFavorited: post.favorite_users?.includes(this.data.userInfo?.openid || '') || false,
          commentCount: post.comment_count || 0,
          likes: post.like_count || 0,
          favoriteCounts: post.favorite_count || 0
        };
      });

      this.setData({
        posts: refresh ? processedPosts : [...this.data.posts, ...processedPosts],
        page: refresh ? 2 : this.data.page + 1,
        hasMore: posts.length === this.data.pageSize,
        loading: false
      })
    } catch (err) {
      console.error('加载帖子失败：', err)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 跳转到发帖页面
  goToPost(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/post/post?id=${id}`
    })
  },

  // 点赞
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset
    try {
      // 使用API模块点赞帖子
      const result = await api.post.likePost(id);

      if (result.success) {
        const key = `posts[${index}].stats.likes`
        const keyLiked = `posts[${index}].userInteraction.isLiked`
        const delta = result.liked ? 1 : -1

        this.setData({
          [key]: this.data.posts[index].stats.likes + delta,
          [keyLiked]: result.liked
        })
      }
    } catch (err) {
      console.error('点赞失败：', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }
  }
}) 