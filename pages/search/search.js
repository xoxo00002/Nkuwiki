const app = getApp()
const config = app.globalData.config || {};
const API_BASE_URL = config.services?.app?.base_url || 'https://nkuwiki.com';
const towxml = require('../../wxcomponents/towxml/index');

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
    
    // 处理链接和图片，提升优先级
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<navigator url="/pages/webview/webview?url=$2" class="md-link">$1</navigator>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<navigator url="/pages/webview/webview?url=$2" class="md-link">$1</navigator>')
    
    // 处理数字编号列表，改进匹配方式
    .replace(/^(\d+)[.、：:]\s*(.*?)$/gm, '<view class="md-li"><text class="md-li-num">$1.</text> $2</view>')
    
    // 无序列表
    .replace(/^\s*[-*+•]\s+(.*?)$/gm, '<view class="md-li">• $1</view>')
    
    // 代码块
    .replace(/```([\s\S]*?)```/g, '<view class="md-code">$1</view>')
    
    // 行内代码
    .replace(/`(.*?)`/g, '<text class="md-inline-code">$1</text>')
    
    // 引用
    .replace(/^\>\s+(.*?)$/gm, '<view class="md-quote">$1</view>')
    
    // 分隔线
    .replace(/^---$/gm, '<view class="md-hr"></view>')
    
    // 段落
    .replace(/\n\n/g, '</view><view class="md-p">');
  
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
    baseUrl: app.globalData.config.services.app.base_url,
    isStreaming: false,
    typingText: '',
    fullResponse: '',
    sources: [],
    // 记录所有会话
    chatHistory: [],
    _lastMarkdown: '',
    _lastMarkdownHtml: '',
    usePlainText: false,  // 是否使用纯文本模式（不使用富文本渲染）
    textContent: '',  // 存储纯文本内容
    richTextContent: null,  // 存储美化后的文本内容
    suggestedQuestions: []
  },

  // 简单高效的Markdown转HTML函数
  simpleMarkdownToHtml: function(markdown) {
    if (!markdown) return '<view class="md-p"></view>';
    
    // 预处理换行和空行
    let text = markdown.trim().replace(/\r\n/g, '\n');
    
    // 添加结束标记，以便于正则匹配
    text += '\n';
    
    // 识别数字编号列表
    text = text.replace(/^(\d+)[.、：:]\s*(.*?)$/gm, 
      '<view class="md-li"><text class="md-li-num">$1.</text> $2</view>');
    
    // 识别无序列表
    text = text.replace(/^\s*[-*+•]\s+(.*?)$/gm, 
      '<view class="md-li">• $1</view>');
    
    // 处理链接 [文本](链接)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, 
      '<navigator url="/pages/webview/webview?url=$2" class="md-link">$1</navigator>');
    
    // 处理标题 - 从h3到h1
    text = text.replace(/^### (.*?)$/gm, '<view class="md-h3">$1</view>');
    text = text.replace(/^## (.*?)$/gm, '<view class="md-h2">$1</view>');
    text = text.replace(/^# (.*?)$/gm, '<view class="md-h1">$1</view>');
    
    // 处理粗体和斜体
    text = text.replace(/\*\*(.*?)\*\*/g, '<text class="md-bold">$1</text>');
    text = text.replace(/\*(.*?)\*/g, '<text class="md-italic">$1</text>');
    
    // 处理单行代码
    text = text.replace(/`(.*?)`/g, '<text class="md-code-inline">$1</text>');
    
    // 处理代码块
    text = text.replace(/```([\s\S]*?)```/g, '<view class="md-code-block">$1</view>');
    
    // 处理引用
    text = text.replace(/^> (.*?)$/gm, '<view class="md-quote">$1</view>');
    
    // 处理分隔线
    text = text.replace(/^-{3,}$/gm, '<view class="md-hr"></view>');
    
    // 将剩余的文本行转换为段落
    const paragraphs = [];
    let currentP = '';
    
    text.split('\n').forEach(line => {
      if (line.trim() === '') {
        if (currentP) {
          paragraphs.push(`<view class="md-p">${currentP}</view>`);
          currentP = '';
        }
      } else if (!line.startsWith('<view') && !line.startsWith('<text') && !line.startsWith('<navigator')) {
        currentP += (currentP ? ' ' : '') + line;
      } else {
        if (currentP) {
          paragraphs.push(`<view class="md-p">${currentP}</view>`);
          currentP = '';
        }
        paragraphs.push(line);
      }
    });
    
    if (currentP) {
      paragraphs.push(`<view class="md-p">${currentP}</view>`);
    }
    
    return paragraphs.join('');
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
      if (this.data.textContent) {
        if (this.data.usePlainText) {
          this.setData({
            richTextContent: null, // 清空富文本内容
            markdownHtml: '' // 清空markdown以便显示纯文本
          });
        } else {
          // 重新生成markdown并更新富文本
          const markdownHtml = this.simpleMarkdownToHtml(this.data.textContent);
          this.setData({
            markdownHtml: markdownHtml
          });
          // 同时更新富文本渲染
          this.formatRichTextContent(this.data.textContent);
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
      richTextContent: null, // 清空富文本内容
      loading: true,
      isStreaming: false, // 不立即显示流式状态
      sources: [], // 清空之前的来源
      suggestedQuestions: [], // 清空建议问题
      markdownHtml: '' // 确保清空markdown HTML
    });

    console.log(`开始搜索: ${searchValue}`);
    
    // 根据配置决定是否使用流式响应
    const useStream = true; // 可以从配置中读取，这里默认使用流式响应
    
    if (useStream) {
      // 使用流式响应搜索
      this.startSimpleStream(searchValue);
    } else {
      // 使用普通搜索
      this.startNormalSearch(searchValue);
    }
    
    // 添加到搜索历史
    this.addToSearchHistory(searchValue);
  },

  // 实时美化文本内容，识别链接、Email等
  formatRichTextContent: function(text) {
    if (!text || this.data.usePlainText) return;
    
    try {
      // 增强链接识别的预处理
      let processedText = text.trim(); // 添加trim()去掉首尾空白
      
      // 先提取所有可能的链接，避免被分块打断
      const links = [];
      let linkId = 0;
      
      // 临时替换链接为占位符
      processedText = processedText.replace(/(\d+)[.、：:]\s*(.*?)[:：]\s*(https?:\/\/[^\s<]+)|(\d+)[.、：:]\s*(.*?)$|^(.*?)[:：]\s*(https?:\/\/[^\s<]+)$|(?<![(\[])(https?:\/\/[^\s<]+)(?![)\]])/gm, 
        (match, num, title, url1, num2, title2, title3, url2, url3) => {
          const placeholder = `__LINK_${linkId}__`;
          if (num && title && url1) {
            // 数字编号的链接: "1. 标题: https://..."
            links.push({
              type: 'numbered_url',
              num,
              title: title.trim(),
              url: url1
            });
          } else if (num2 && title2) {
            // 数字编号无链接: "1. 标题"
            links.push({
              type: 'numbered',
              num: num2,
              title: title2.trim()
            });
          } else if (title3 && url2) {
            // 标题: 链接格式 "标题: https://..."
            links.push({
              type: 'titled',
              title: title3.trim(),
              url: url2
            });
          } else if (url3) {
            // 单独的链接 "https://..."
            links.push({
              type: 'plain',
              url: url3
            });
          }
          linkId++;
          return placeholder;
        }
      );
      
      // 将链接还原为Markdown格式
      links.forEach((link, index) => {
        const placeholder = `__LINK_${index}__`;
        if (link.type === 'numbered_url') {
          processedText = processedText.replace(placeholder, 
            `${link.num}. [${link.title}](${link.url})`);
        } else if (link.type === 'numbered') {
          processedText = processedText.replace(placeholder, 
            `${link.num}. ${link.title}`);
        } else if (link.type === 'titled') {
          processedText = processedText.replace(placeholder, 
            `[${link.title}](${link.url})`);
        } else {
          processedText = processedText.replace(placeholder, 
            `[${link.url}](${link.url})`);
        }
      });
      
      // 使用 towxml 处理文本
      const result = towxml(processedText, 'markdown', {
        theme: 'light',
        audio: false,
        external_link: true,
        emoji: false,
        latex: false,
        highlight: false,
        events: {
          tap: (e) => {
            // 处理链接点击
            if (e.currentTarget.dataset.data && e.currentTarget.dataset.data.attr && e.currentTarget.dataset.data.attr.href) {
              const url = e.currentTarget.dataset.data.attr.href;
              if (url.startsWith('http')) {
                wx.showActionSheet({
                  itemList: ['复制链接', '在浏览器中打开'],
                  success: function(res) {
                    if (res.tapIndex === 0) {
                      wx.setClipboardData({
                        data: url,
                        success: function() {
                          wx.showToast({
                            title: '链接已复制',
                            icon: 'success'
                          });
                        }
                      });
                    } else if (res.tapIndex === 1) {
                      wx.navigateTo({
                        url: `/pages/webview/webview?url=${encodeURIComponent(url)}`,
                        fail: function() {
                          wx.setClipboardData({
                            data: url,
                            success: function() {
                              wx.showModal({
                                title: '链接已复制',
                                content: '链接已复制到剪贴板，您可以在浏览器中打开',
                                showCancel: false
                              });
                            }
                          });
                        }
                      });
                    }
                  }
                });
              }
            }
          }
        }
      });

      this.setData({
        richTextContent: result
      });
      
    } catch (error) {
      console.error('处理富文本失败:', error);
      this.setData({
        richTextContent: {
          child: [{
            type: 'text',
            text: text.trim() // 这里也添加trim()
          }]
        }
      });
    }
  },

  // 处理流式响应
  startSimpleStream: function(query) {
    const that = this;
    
    // 获取用户微信ID
    const userInfo = wx.getStorageSync('userInfo') || {};
    const openid = userInfo.openid || wx.getStorageSync('openid');
    
    // 获取最近的几条对话历史
    const chatHistory = this.data.chatHistory || [];
    const recentMessages = [];
    
    // 最多取最近5条对话组成上下文
    for (let i = 0; i < Math.min(5, chatHistory.length); i++) {
      const chat = chatHistory[i];
      if (chat.question) {
        recentMessages.push({
          role: "user",
          content: chat.question
        });
      }
      if (chat.answer) {
        recentMessages.push({
          role: "assistant", 
          content: chat.answer
        });
      }
    }
    
    // 添加当前的问题
    recentMessages.unshift({
      role: "user",
      content: query
    });
    
    // 构建请求数据
    const requestData = {
      query: query,          // 当前查询
      messages: recentMessages, // 对话历史
      stream: true,          // 开启流式响应
      format: "markdown",    // 使用markdown格式
      openid: openid || ''   // 用户标识
    };

    console.log('请求参数:', {
      ...requestData,
      messages: `包含${recentMessages.length}条消息` // 避免输出完整历史
    });
    console.log('请求URL:', `${API_BASE_URL}/api/agent/chat`);
    
    // 获取系统信息
    let isDevTool = false;
    try {
      const appBaseInfo = wx.getAppBaseInfo();
      isDevTool = appBaseInfo.platform === 'devtools';
      console.log('系统环境:', appBaseInfo.platform);
    } catch (e) {
      console.warn('获取系统信息失败');
    }
    
    // 初始化累积的响应文本
    let accumulatedText = '';
    let buffer = ''; // 缓冲区，用于处理不完整的数据行
    let responseTimer = null;
    let hasFinalResponse = false;
    let pendingBytes = []; // 用于存储可能被截断的UTF-8字节
    
    // 设置超时处理
    responseTimer = setTimeout(() => {
      if (!hasFinalResponse && that.data.loading) {
        console.warn('请求超时');
        that.setData({ 
          loading: false,
          isStreaming: false,
          textContent: that.data.textContent || '请求超时，请重试'
        });
        // 避免使用wx.showToast，以免与页面上的加载指示器冲突
      }
    }, 30000); // 30秒超时
    
    // 使用wx.request实现SSE
    const requestTask = wx.request({
      url: `${API_BASE_URL}/api/agent/chat`,
      method: 'POST',
      data: requestData,
      header: {
        'content-type': 'application/json',
        'Accept': 'text/event-stream'
      },
      enableChunked: true, // 启用分块传输
      responseType: 'arraybuffer',
      success(res) {
        console.log('请求成功初始化');
      },
      fail(err) {
        console.error('请求失败:', err);
        
        // 添加更详细的错误信息
        let errorMsg = '网络请求失败';
        if (err && err.errMsg) {
          // 检查是否是HTTP错误
          if (err.errMsg.includes('fail 500')) {
            errorMsg = '服务器内部错误 (500)';
          } else if (err.errMsg.includes('fail 404')) {
            errorMsg = '接口不存在 (404)';
          } else if (err.errMsg.includes('fail 400')) {
            errorMsg = '请求参数错误 (400)';
          } else if (err.errMsg.includes('fail 401')) {
            errorMsg = '未授权 (401)';
          } else if (err.errMsg.includes('fail timeout')) {
            errorMsg = '请求超时';
          }
          console.error('错误详情:', err.errMsg);
        }
        
        // 不使用showToast，避免冲突
        that.setData({ 
          loading: false, 
          isStreaming: false,
          textContent: errorMsg
        });
      },
      complete() {
        // 请求完成时（无论成功失败）都关闭加载状态
        clearTimeout(responseTimer);
        hasFinalResponse = true;
        that.setData({ 
          loading: false,
          isStreaming: false 
        });
      }
    });
    
    // 创建一个变量跟踪是否收到至少一个数据块
    let receivedFirstChunk = false;
    let totalChunks = 0;
    
    // 监听数据接收事件
    requestTask.onChunkReceived(function(res) {
      try {
        totalChunks++;
        
        // 如果是第一个数据块，关闭loading，设置isStreaming状态
        if (!receivedFirstChunk) {
          receivedFirstChunk = true;
          that.setData({ 
            loading: false,
            isStreaming: true
          });
        }
        
        // 将二进制数据转换为字符串
        let chunk;
        if (isDevTool) {
          // 开发工具支持TextDecoder
          chunk = new TextDecoder('utf-8').decode(new Uint8Array(res.data));
        } else {
          // 原来的方法不能正确处理UTF-8编码的中文
          // chunk = String.fromCharCode.apply(null, new Uint8Array(res.data));
          // 统一使用TextDecoder处理
          try {
            // 处理可能被截断的UTF-8字符
            const currentBytes = new Uint8Array(res.data);
            
            // 如果有挂起的字节，合并处理
            if (pendingBytes.length > 0) {
              const combinedBytes = new Uint8Array(pendingBytes.length + currentBytes.length);
              combinedBytes.set(pendingBytes);
              combinedBytes.set(currentBytes, pendingBytes.length);
              pendingBytes = []; // 清空挂起字节
              chunk = new TextDecoder('utf-8').decode(combinedBytes);
            } else {
              chunk = new TextDecoder('utf-8').decode(currentBytes);
            }
          } catch (e) {
            console.error('TextDecoder解码失败，尝试备用方法:', e);
            // 备用方法
            const bytes = new Uint8Array(res.data);
            chunk = '';
            // 处理UTF-8编码
            for (let i = 0; i < bytes.length; i++) {
              chunk += '%' + bytes[i].toString(16).padStart(2, '0');
            }
            try {
              chunk = decodeURIComponent(chunk);
            } catch (e) {
              console.error('备用解码也失败:', e);
              // 如果解码失败，至少返回原始数据，避免请求中断
              chunk = String.fromCharCode.apply(null, bytes);
            }
          }
        }
        
        // 追加到buffer
        buffer += chunk;
        
        // 处理缓冲区中的数据行
        const lines = buffer.split('\n');
        // 保留最后一个可能不完整的行
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            
            // 检查是否是流结束标记
            if (data === '[DONE]') {
              console.log('流式响应结束');
              hasFinalResponse = true;
              clearTimeout(responseTimer);
              that.setData({ 
                isStreaming: false,
                loading: false
              });
              
              // 保存对话记录
              if (accumulatedText && accumulatedText.trim()) {
                that.saveChatHistory(query, accumulatedText.trim(), that.data.sources || []);
              }
              continue;
            }
            
            // 添加调试信息
            if (totalChunks <= 5) {
              console.debug(`接收到文本片段[${totalChunks}]:`, data);
            }
            
            // 添加文本片段到累积文本
            accumulatedText += data;
            
            // 更新UI显示
            const processedText = accumulatedText.trim();
            that.setData({
              textContent: processedText
            });
            
            // 处理富文本显示
            if (!that.data.usePlainText) {
              // 使用自定义Markdown渲染器生成HTML
              const markdownHtml = that.simpleMarkdownToHtml(processedText);
              that.setData({
                markdownHtml: markdownHtml
              });
              
              // 格式化富文本内容
              that.formatRichTextContent(processedText);
            }
          } else if (line.trim() && !line.startsWith(':')) {
            // 处理非空行且不是SSE注释行
            console.warn('未知格式的数据行:', line);
          }
        }
        
        // 在处理完后添加诊断信息
        if (totalChunks % 10 === 0) {
          console.debug(`已处理${totalChunks}个数据块，当前文本长度:${accumulatedText.length}`);
        }
      } catch (error) {
        console.error('处理数据失败:', error, error.stack);
        
        // 更详细的错误诊断
        if (error instanceof TypeError) {
          console.error('类型错误，可能是数据格式问题');
        } else if (error instanceof URIError) {
          console.error('URI编码错误，可能是解码问题');
        }
        
        // 确保错误不会中断整个处理流程
        try {
          that.setData({
            isStreaming: true,
            textContent: that.data.textContent || '接收数据时出错，但会继续处理'
          });
        } catch (e) {
          console.error('更新UI失败:', e);
        }
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
    
    // 使用纯文本内容进行复制，确保格式正确
    const textToCopy = this.data.textContent;
    
    wx.setClipboardData({
      data: textToCopy,
      success() {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      },
      fail(err) {
        console.error('复制失败:', err);
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 清空搜索结果
  clearResult() {
    this.setData({
      textContent: '',
      richTextContent: null,
      isStreaming: false
    });
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
      // 提供更好的用户体验
      wx.showActionSheet({
        itemList: ['复制链接', '在浏览器中打开'],
        success: function(res) {
          if (res.tapIndex === 0) {
            // 复制链接
            wx.setClipboardData({
              data: source,
              success: function() {
                wx.showToast({
                  title: '链接已复制',
                  icon: 'success'
                });
              }
            });
          } else if (res.tapIndex === 1) {
            // 尝试通过webview页面打开链接
            wx.navigateTo({
              url: `/pages/webview/webview?url=${encodeURIComponent(source)}`,
              fail: function() {
                // 如果没有webview页面，则提示用户在浏览器打开
                wx.setClipboardData({
                  data: source,
                  success: function() {
                    wx.showModal({
                      title: '链接已复制',
                      content: '链接已复制到剪贴板，您可以在浏览器中打开',
                      showCancel: false
                    });
                  }
                });
              }
            });
          }
        }
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
  },

  // 添加到搜索历史
  addToSearchHistory(query) {
    const history = this.data.searchHistory || [];
    if (history.length >= 50) {
      history.pop();
    }
    history.unshift(query);
    this.setData({ searchHistory: history });
    wx.setStorageSync('searchHistory', history);
  },

  // 普通搜索请求（非流式）
  startNormalSearch: function(query) {
    const that = this;
    
    // 获取用户微信ID
    const userInfo = wx.getStorageSync('userInfo') || {};
    const openid = userInfo.openid || wx.getStorageSync('openid');
    
    // 获取最近的几条对话历史
    const chatHistory = this.data.chatHistory || [];
    const recentMessages = [];
    
    // 最多取最近5条对话组成上下文
    for (let i = 0; i < Math.min(5, chatHistory.length); i++) {
      const chat = chatHistory[i];
      if (chat.question) {
        recentMessages.push({
          role: "user",
          content: chat.question
        });
      }
      if (chat.answer) {
        recentMessages.push({
          role: "assistant", 
          content: chat.answer
        });
      }
    }
    
    // 添加当前的问题
    recentMessages.unshift({
      role: "user",
      content: query
    });
    
    // 构建请求数据
    const requestData = {
      query: query,          // 当前查询
      messages: recentMessages, // 对话历史
      stream: false,         // 关闭流式响应
      format: "markdown",    // 使用markdown格式
      openid: openid || ''   // 用户标识
    };

    console.log('请求参数:', {
      ...requestData,
      messages: `包含${recentMessages.length}条消息` // 避免输出完整历史
    });
    console.log('请求URL:', `${API_BASE_URL}/api/agent/chat`);
    
    // 设置请求超时定时器
    let requestTimer = setTimeout(() => {
      that.setData({
        loading: false,
        textContent: '请求超时，请重试'
      });
      
      // 不使用showToast，避免与页面加载指示器冲突
    }, 30000); // 30秒超时
    
    // 发起请求
    wx.request({
      url: `${API_BASE_URL}/api/agent/chat`,
      method: 'POST',
      data: requestData,
      header: {
        'content-type': 'application/json'
      },
      success(res) {
        clearTimeout(requestTimer);
        
        if (res.statusCode === 200 && res.data && res.data.code === 200) {
          const responseData = res.data.data;
          
          // 存储响应文本
          const responseText = responseData.response || '';
          
          // 更新界面
          that.setData({
            textContent: responseText,
            loading: false
          });
          
          // 处理富文本显示
          if (!that.data.usePlainText && responseText) {
            // 使用自定义Markdown渲染器生成HTML
            const markdownHtml = that.simpleMarkdownToHtml(responseText);
            that.setData({
              markdownHtml: markdownHtml
            });
            
            // 格式化富文本内容
            that.formatRichTextContent(responseText);
          }
          
          // 处理知识源
          if (responseData.sources && Array.isArray(responseData.sources)) {
            that.setData({ sources: responseData.sources });
          }
          
          // 处理建议问题
          if (responseData.suggested_questions && Array.isArray(responseData.suggested_questions)) {
            that.setData({ suggestedQuestions: responseData.suggested_questions });
          }
          
          // 保存对话记录
          that.saveChatHistory(query, responseText, responseData.sources || []);
        } else {
          // 处理错误响应
          console.error('API返回错误:', res.data);
          let errorMsg = '搜索失败';
          
          if (res.data && res.data.message) {
            errorMsg = res.data.message;
          }
          
          that.setData({
            loading: false,
            textContent: `请求出错: ${errorMsg}`
          });
          
          // 不使用showToast，避免与页面加载指示器冲突
        }
      },
      fail(err) {
        clearTimeout(requestTimer);
        console.error('请求失败:', err);
        
        let errorMsg = '网络请求失败';
        if (err && err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMsg = '请求超时';
          }
        }
        
        that.setData({
          loading: false,
          textContent: errorMsg
        });
        
        // 不使用showToast，避免与页面加载指示器冲突
      }
    });
  }
}) 