const app = getApp()
const config = app.globalData.config || {};
const API_BASE_URL = config.services?.app?.base_url || 'http://localhost:80';

// 简单的Markdown解析函数
function parseMarkdown(markdown) {
  if (!markdown) return '';
  
  // 替换标题
  let html = markdown
    // 标题
    .replace(/### (.*?)\n/g, '<h3>$1</h3>')
    .replace(/## (.*?)\n/g, '<h2>$1</h2>')
    .replace(/# (.*?)\n/g, '<h1>$1</h1>')
    
    // 加粗和斜体
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // 链接
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="md-link">$1</a>')
    
    // 无序列表
    .replace(/^\s*[-*+]\s+(.*?)$/gm, '<view class="md-li">• $1</view>')
    
    // 有序列表 
    .replace(/^\s*(\d+)\.\s+(.*?)$/gm, '<view class="md-li"><text class="md-li-num">$1.</text> $2</view>')
    
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<view class="md-code">$1</view>')
    
    // 行内代码
    .replace(/`(.*?)`/g, '<text class="md-inline-code">$1</text>')
    
    // 引用
    .replace(/^\>\s+(.*?)$/gm, '<view class="md-quote">$1</view>')
    
    // 分隔线
    .replace(/^---$/gm, '<view class="md-hr"></view>')
    
    // 段落
    .replace(/\n\n/g, '</view><view class="md-p">')
    
    // URL突出显示
    .replace(/(https?:\/\/[^\s<]+)/g, '<text class="md-url">$1</text>');
  
  // 确保段落包裹
  html = '<view class="md-p">' + html + '</view>';
  
  return html;
}

Page({
  data: {
    searchValue: '',
    searchHistory: [],
    searchResults: [],
    markdownHtml: '',
    loading: false,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    baseUrl: `${app.globalData.config.services.app.base_url}:${app.globalData.config.services.app.port}`,
    isStreaming: false,
    typingText: '',
    fullResponse: '',
    sources: [],
    // 记录所有会话
    chatHistory: [],
    _lastMarkdown: '',
    _lastMarkdownHtml: '',
    usePlainText: false,  // 是否使用纯文本模式（不使用富文本渲染）
    textContent: ''  // 存储纯文本内容
  },

  // 处理输入框变化
  onInputChange(e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  // 切换纯文本模式
  togglePlainTextMode() {
    this.setData({
      usePlainText: !this.data.usePlainText
    }, () => {
      // 如果已有内容，重新渲染
      if (this.data.fullResponse) {
        if (this.data.usePlainText) {
          this.setData({
            markdownHtml: '' // 清空markdown以便显示纯文本
          });
        } else {
          // 重新生成markdown
          const markdownHtml = this.simpleMarkdownToHtml(this.data.fullResponse);
          this.setData({
            markdownHtml: markdownHtml
          });
        }
      }
      
      // 提示用户
      wx.showToast({
        title: this.data.usePlainText ? '已切换到纯文本模式' : '已切换到富文本模式',
        icon: 'none'
      });
    });
  },

  // 加载历史会话
  loadChatHistory: function() {
    const chatHistory = wx.getStorageSync('chatHistory') || [];
    this.setData({ chatHistory });
  },

  // 保存会话历史
  saveChatHistory: function(question, answer, sources = []) {
    const chatHistory = this.data.chatHistory;
    
    // 限制历史记录数量，保留最新50条
    if (chatHistory.length >= 50) {
      chatHistory.pop();
    }
    
    chatHistory.unshift({
      id: new Date().getTime(),
      question,
      answer,
      sources,
      timestamp: new Date().toISOString()
    });
    
    this.setData({ chatHistory });
    wx.setStorageSync('chatHistory', chatHistory);
  },

  // 处理搜索事件
  handleSearch() {
    const { searchValue } = this.data;
    if (!searchValue.trim()) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }

    this.setData({
      textContent: '',  // 清空之前的内容
      loading: true,
      isStreaming: false // 不立即显示流式状态，避免出现"正在生成"
    });

    console.log(`开始搜索: ${searchValue}`);
    
    // 发起流式搜索请求
    this.startSimpleStream(searchValue);
  },

  // 简化的流式响应实现
  startSimpleStream(query) {
    const that = this;
    
    // 构建请求数据
    const requestData = {
      query: query,
      stream: true,  // 开启流式响应
      format: 'text' // 直接请求纯文本
    };

    console.log('请求参数:', requestData);
    console.log('请求URL:', `${API_BASE_URL}/agent/chat`);
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    const isDevTool = systemInfo.platform === 'devtools';
    
    // 使用wx.request实现SSE
    const requestTask = wx.request({
      url: `${API_BASE_URL}/agent/chat`,
      method: 'POST',
      data: requestData,
      header: {
        'content-type': 'application/json',
        'Accept': 'text/event-stream'
      },
      enableChunked: true, // 启用分块传输，支持流式响应
      responseType: 'arraybuffer', // 使用arraybuffer接收二进制数据
      success(res) {
        console.log('请求成功初始化');
      },
      fail(err) {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        that.setData({ loading: false, isStreaming: false });
      },
      complete() {
        console.log('请求完成');
        that.setData({ loading: false, isStreaming: false });
      }
    });
    
    // 创建一个变量跟踪是否收到至少一个数据块
    let receivedFirstChunk = false;
    
    // 监听数据接收事件
    requestTask.onChunkReceived(function(res) {
      try {
        // 第一次收到数据时，设置isStreaming为true以显示打字光标效果
        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          that.setData({ isStreaming: true });
        }
        
        // 将二进制数据转换为字符串
        let text;
        if (isDevTool) {
          // 开发者工具中使用TextDecoder
          text = new TextDecoder('utf-8').decode(new Uint8Array(res.data));
        } else {
          // 真机中使用字符串转换
          text = String.fromCharCode.apply(null, new Uint8Array(res.data));
        }
        
        // 处理数据
        let content = '';
        
        // 处理SSE格式 (data: {...})
        if (text.includes('data:')) {
          const matches = text.match(/data:\s*({.+?})/g) || [];
          for (const match of matches) {
            try {
              const jsonStr = match.replace(/^data:\s*/, '');
              const data = JSON.parse(jsonStr);
              
              // 提取内容
              if (data.content !== undefined) {
                // 处理Unicode编码
                if (typeof data.content === 'string' && data.content.includes('\\u')) {
                  try {
                    content += JSON.parse('"' + data.content.replace(/"/g, '\\"') + '"');
                  } catch (e) {
                    content += data.content;
                  }
                } else {
                  content += data.content;
                }
              }
            } catch (e) {
              console.warn('解析数据失败:', e);
            }
          }
        } else if (text.startsWith('{') && text.endsWith('}')) {
          // 直接JSON格式
          try {
            const data = JSON.parse(text);
            if (data.content !== undefined) {
              // 处理Unicode编码
              if (typeof data.content === 'string' && data.content.includes('\\u')) {
                try {
                  content += JSON.parse('"' + data.content.replace(/"/g, '\\"') + '"');
                } catch (e) {
                  content += data.content;
                }
              } else {
                content += data.content;
              }
            }
          } catch (e) {
            console.warn('解析JSON失败:', e);
          }
        } else {
          // 纯文本格式
          content = text;
        }
        
        // 更新显示内容
        if (content) {
          const newContent = that.data.textContent + content;
          that.setData({
            textContent: newContent
          });
        }
      } catch (error) {
        console.error('处理数据失败:', error);
      }
    });
  },

  // 复制结果
  copyResult() {
    if (!this.data.textContent) {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none'
      });
      return;
    }
    
    wx.setClipboardData({
      data: this.data.textContent,
      success() {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },
  
  // 清空搜索结果
  clearResult() {
    this.setData({
      textContent: '',
      isStreaming: false
    });
  },
  
  // 测试函数
  testStream() {
    this.setData({
      searchValue: '测试流式响应',
      textContent: '',
      loading: true,
      isStreaming: false // 不立即显示流式状态
    });
    
    // 模拟接收第一个数据块后设置isStreaming为true
    setTimeout(() => {
      this.setData({ isStreaming: true });
    }, 500);
    
    // 模拟流式响应
    const testData = [
      '这是一个',
      '简单的',
      '流式响应',
      '测试，',
      '每个片段',
      '会逐步',
      '显示。',
      '\n\n',
      '1. 第一点',
      '\n',
      '2. 第二点',
      '\n',
      '3. 第三点'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index >= testData.length) {
        clearInterval(interval);
        this.setData({
          loading: false,
          isStreaming: false
        });
        return;
      }
      
      const newContent = this.data.textContent + testData[index];
      this.setData({
        textContent: newContent
      });
      
      index++;
    }, 300);
  },

  // 滚动到底部
  scrollToBottom: function() {
    try {
      // 延迟执行，确保内容已渲染
      setTimeout(() => {
        wx.createSelectorQuery()
          .select('.result-container')
          .boundingClientRect(function(rect){
            if (rect) {
              wx.pageScrollTo({
                scrollTop: rect.bottom,
                duration: 300
              });
            }
          })
          .exec();
      }, 100);
    } catch (e) {
      console.error('滚动到底部失败:', e);
    }
  },
  
  // 简单的Markdown转HTML实现 - 优化版
  simpleMarkdownToHtml: function(markdown) {
    if (!markdown) return '';
    
    try {
      // 对大型文本进行简单的缓存处理
      if (this._lastMarkdown === markdown) {
        console.log('使用缓存的Markdown HTML');
        return this._lastMarkdownHtml;
      }
      
      console.log('解析Markdown内容(长度):', markdown.length);
      
      // 检查内容是否包含未解码的Unicode
      if (typeof markdown === 'string' && markdown.includes('\\u')) {
        try {
          console.log('检测到Unicode转义序列，尝试解码');
          // 尝试解码Unicode转义序列
          markdown = JSON.parse('"' + markdown.replace(/"/g, '\\"') + '"');
          console.log('Unicode解码后长度:', markdown.length);
        } catch (e) {
          console.warn('Unicode解码失败:', e);
          // 保持原样
        }
      }
      
      // 确保内容至少被包裹在段落标签中
      let html = '';
      if (markdown.trim().length === 0) {
        // 如果是空内容，至少显示一个空段落
        html = '<view class="md-p">暂无内容</view>';
      } else if (markdown.length < 3 && !markdown.includes('\n')) {
        // 对于非常短的内容（1-2个字符），不进行Markdown解析，直接包装
        html = `<view class="md-p">${markdown}</view>`;
      } else {
        // 使用parseMarkdown函数处理markdown
        html = parseMarkdown(markdown);
        
        // 检查是否成功生成HTML
        if (!html || html.trim() === '') {
          console.warn('Markdown解析生成了空HTML，使用备用方法');
          // 备用方法：简单替换换行符并包装在段落中
          html = '<view class="md-p">' + markdown.replace(/\n/g, '<br>') + '</view>';
        }
      }
      
      // 确保生成的HTML不为空
      if (!html || html.trim() === '') {
        html = '<view class="md-p">内容解析错误，请尝试使用纯文本模式查看</view>';
      }
      
      // 缓存处理结果
      this._lastMarkdown = markdown;
      this._lastMarkdownHtml = html;
      
      console.log('生成HTML结果长度:', html.length);
      return html;
    } catch (error) {
      console.error('Markdown转换错误:', error);
      // 发生错误时，确保至少显示原始文本
      return '<view class="md-p">' + (markdown || '内容解析错误') + '</view>';
    }
  },

  // 处理响应错误
  handleResponseError: function(errorMsg) {
    this.setData({
      loading: false,
      isStreaming: false
    });
    
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    });
  },

  // 分享搜索结果
  shareResult: function() {
    // 在小程序中不能直接调用分享，需要用户点击右上角的分享按钮
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none'
    });
  },

  // 反馈搜索结果
  feedbackResult: function() {
    wx.navigateTo({
      url: '/pages/feedback/feedback?query=' + encodeURIComponent(this.data.searchValue)
    });
  },

  // 打开来源链接
  openSource: function(e) {
    const source = e.currentTarget.dataset.source;
    
    if (!source) return;
    
    // 判断来源类型，处理不同来源的打开方式
    if (source.startsWith('http')) {
      // 网页链接
      wx.navigateTo({
        url: '/pages/webview/webview?url=' + encodeURIComponent(source)
      });
    } else {
      // 其他类型资源，例如文件、文档等
      wx.showToast({
        title: '暂不支持打开此类资源',
        icon: 'none'
      });
    }
  },

  // 导航到分类
  navigateToCategory: function(e) {
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: '/pages/category/category?type=' + type
    });
  },

  // 导航到贡献页
  navigateToContribute: function() {
    wx.navigateTo({
      url: '/pages/contribute/contribute'
    });
  },

  // 处理推荐问题点击
  handleRecommendClick: function(e) {
    const question = e.currentTarget.dataset.question;
    if (question) {
      this.setData({
        searchValue: question
      });
      this.handleSearch();
    }
  },

  // 刷新新闻
  refreshNews: function() {
    wx.showLoading({
      title: '刷新中...',
    });
    
    // 模拟刷新操作
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    }, 1000);
  },

  // 打开新闻详情
  openNewsDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/news/detail?id=' + id
    });
  },

  // 查看更多热榜
  viewMoreHot: function() {
    wx.navigateTo({
      url: '/pages/hot/list'
    });
  },

  // 打开热榜详情
  openHotDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/hot/detail?id=' + id
    });
  },

  // 用户点击右上角分享
  onShareAppMessage: function() {
    const query = this.data.searchValue;
    return {
      title: `南开wiki - ${query}`,
      path: `/pages/search/search?query=${encodeURIComponent(query)}`
    };
  },

  onLoad: function(options) {
    // 如果从其他页面跳转过来并携带参数
    if (options.query) {
      this.setData({
        searchValue: decodeURIComponent(options.query)
      });
      this.handleSearch();
    }
    
    // 初始化会话历史
    this.loadChatHistory();
  },
  
  onUnload: function() {
    // 清除定时器
    if (this.data.typingTimer) {
      clearInterval(this.data.typingTimer);
    }
  },

  // 添加测试方法
  testSSE: function() {
    console.log('开始测试SSE流式响应');
    // 使用一个容易跟踪的测试查询
    const testQuery = "测试流式响应";
    
    this.setData({
      searchValue: testQuery,
      loading: true,
      isStreaming: true,
      markdownHtml: '<view class="md-p">正在测试流式响应...</view>',
      fullResponse: '',
      searchResults: []
    });
    
    // 直接调用流式请求方法
    this.startChatStream(testQuery);
    
    // 延迟2秒后再启动本地测试，避免与实际请求混淆
    setTimeout(() => {
      // 仅当实际接口没有返回数据时才启动本地测试
      if (!this.data.fullResponse || this.data.fullResponse.length === 0) {
        console.log('实际请求无数据返回，启动本地测试');
        this.testLocalStream();
      }
    }, 2000);
  },
  
  // 本地测试流式数据处理
  testLocalStream: function() {
    console.log('开始本地流式测试');
    const that = this;
    
    // 模拟的数据块，包含Unicode示例
    const mockChunks = [
      'data: {"content": "测"}',
      'data: {"content": "\\u8bd5"}', // "试"的Unicode
      'data: {"content": "流"}',
      'data: {"content": "\\u5f0f"}', // "式"的Unicode
      'data: {"content": "响"}',
      'data: {"content": "应"}',
      'data: {"content": "\\n"}',      // 换行符
      'data: {"content": "1"}',
      'data: {"content": "\\n"}',
      'data: {"content": "2"}',
      'data: {"content": "\\n"}',
      'data: {"content": "3"}'
    ];
    
    // 清空当前响应，以便测试
    that.setData({
      fullResponse: '',
      markdownHtml: '',
      searchResults: []
    });
    
    let index = 0;
    let localResponse = '';
    
    // 模拟数据块逐个接收
    const interval = setInterval(() => {
      if (index >= mockChunks.length) {
        clearInterval(interval);
        console.log('本地测试完成，最终响应:', localResponse);
        
        // 测试结束后，切换到纯文本模式以便查看结果
        setTimeout(() => {
          if (!that.data.usePlainText) {
            that.togglePlainTextMode();
          }
        }, 1000);
        
        return;
      }
      
      // 获取当前数据块
      const chunk = mockChunks[index++];
      console.log('模拟接收数据:', chunk);
      
      try {
        // 解析数据块
        if (chunk.includes('data:')) {
          const jsonStr = chunk.replace(/^data:\s*/, '');
          const data = JSON.parse(jsonStr);
          if (data.content !== undefined) {
            // 处理Unicode
            let content = data.content;
            if (typeof content === 'string' && content.includes('\\u')) {
              try {
                content = JSON.parse('"' + content.replace(/"/g, '\\"') + '"');
                console.log('解码Unicode后:', content);
              } catch (err) {
                console.warn('Unicode解码失败:', err);
              }
            }
            
            localResponse += content;
            
            // 更新界面
            const html = that.simpleMarkdownToHtml(localResponse);
            that.setData({
              fullResponse: localResponse,
              searchResults: [localResponse],
              markdownHtml: html,
              isStreaming: true
            });
            
            console.log('本地测试更新响应:', localResponse);
          }
        }
      } catch (error) {
        console.error('本地测试解析错误:', error);
      }
    }, 500); // 每500ms发送一个数据块
  },

  // 处理上传文件
  uploadFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].path;
        const fileName = res.tempFiles[0].name;
        
        wx.showLoading({
          title: '正在上传...',
        });
        
        // 这里可以实现实际的文件上传逻辑
        console.log('选择的文件:', fileName);
        console.log('文件路径:', tempFilePath);
        
        // 模拟上传过程
        setTimeout(() => {
          wx.hideLoading();
          wx.showToast({
            title: '文件已上传',
            icon: 'success'
          });
          
          // 可以根据需要处理上传后的逻辑
          this.setData({
            searchValue: `已上传: ${fileName}`
          });
        }, 1500);
      },
      fail: (err) => {
        console.error('选择文件失败:', err);
        wx.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 开始语音搜索
  startVoiceSearch() {
    // 检查是否支持录音
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this.beginVoiceRecognition();
            },
            fail: () => {
              wx.showToast({
                title: '需要录音权限',
                icon: 'none'
              });
            }
          });
        } else {
          this.beginVoiceRecognition();
        }
      }
    });
  },
  
  // 开始语音识别
  beginVoiceRecognition() {
    const recorderManager = wx.getRecorderManager();
    
    // 配置录音参数
    const options = {
      duration: 10000, // 最长录音时间，单位ms
      sampleRate: 16000, // 采样率
      numberOfChannels: 1, // 录音通道数
      encodeBitRate: 64000, // 编码码率
      format: 'mp3', // 音频格式
      frameSize: 50 // 指定帧大小，单位KB
    };
    
    // 监听录音结束事件
    recorderManager.onStop((res) => {
      console.log('录音结束:', res);
      const { tempFilePath } = res;
      
      wx.showLoading({
        title: '正在识别...',
      });
      
      // 这里可以实现实际的语音识别逻辑
      // 模拟识别过程
      setTimeout(() => {
        wx.hideLoading();
        
        // 模拟识别结果
        const recognizedText = "南开大学的校训是什么";
        
        this.setData({
          searchValue: recognizedText
        });
        
        // 自动执行搜索
        this.handleSearch();
      }, 1500);
    });
    
    // 开始录音
    recorderManager.start(options);
    
    wx.showToast({
      title: '正在录音...',
      icon: 'none',
      duration: 10000 // 与录音时长相同
    });
    
    // 3秒后停止录音（实际应用中可以使用按钮控制停止）
    setTimeout(() => {
      recorderManager.stop();
      wx.hideToast();
    }, 3000);
  }
}) 