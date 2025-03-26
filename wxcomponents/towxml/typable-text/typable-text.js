Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    text: {
      type: String,
      value: "",
    },
    textId: {
      type: String,
      value: "",
    },
    openTyper: {
      type: Boolean,
      value: false,
    },
    speed: {
      type: Number,
      value: 15,
    },
    noType: {
      type: Boolean,
      value: true,
    },
  },
  observers: {
    textId: function (newVal) {
      console.log('typable-text接收到ID:', newVal, '文本内容:', this.data.text);
      if (this.data.hasInitCb == false) {
        this.data.hasInitCb = true;
        this.initCb();
      }
    },
  },
  lifetimes: {
    attached: function () {
      console.log('typable-text组件attached, ID:', this.data.textId, '文本:', this.data.text);
      if (this.data.hasInitCb == false) {
        this.data.hasInitCb = true;
        this.initCb();
      }
    },
    ready: function () {
      console.log('typable-text组件ready, ID:', this.data.textId, '是否是最后叶节点:', this.data.hasLastLeafNode);
      if (this.data.hasLastLeafNode) {
        this.startTraverse();
      }
    },
  },
  data: {
    currentText: "",
    timer: null,
    isShow: false,
    hasLastLeafNode: false,
    hasInitCb: false,
  },
  methods: {
    show() {
      console.log("显示文本节点, ID:", this.data.textId, "文本:", this.data.text);
      this.data.isShow = true;
      this.setData({ isShow: this.data.isShow });
    },
    initCb() {
      const newVal = this.data.textId;
      // 属性值变化时执行的逻辑
      const {
        typeShowCbMap,
        curLastLeafNodeId,
        openTyper,
      } = require("../typer");
      
      console.log('初始化打字回调, ID:', newVal, '是否启用打字机:', openTyper.value, '最后节点ID:', curLastLeafNodeId.value);
      
      if (newVal && openTyper.value) {
        // 只有当文本非空时才注册打字回调
        if (this.data.text && this.data.text.trim()) {
          typeShowCbMap.value[newVal] = (resolve) => {
            this.show();
            this.startTyping(resolve);
          };
          
          if (newVal == curLastLeafNodeId.value) {
            console.log("匹配到最后一个节点:", newVal);
            this.data.hasLastLeafNode = true;
          }
        } else {
          // 对于空文本节点，直接显示并立即完成
          console.log("空文本节点，直接完成:", newVal);
          this.data.isShow = true;
          this.setData({ isShow: this.data.isShow });
          if (newVal == curLastLeafNodeId.value) {
            console.log("空文本节点是最后一个节点，开始遍历:", newVal);
            this.data.hasLastLeafNode = true;
            this.startTraverse();
          }
        }
      }
    },
    startTraverse() {
      const {
        typeShowCbMap,
        curNodes,
        lastScrollTime,
        scrollCb,
        scrollTimer,
        traverse,
        isTyping,
        renderStartTime,
      } = require("../typer");
      console.log("打字文本中匹配到最后一个，开始遍历");
      console.log("开始遍历前typeShowCbMap的值", typeShowCbMap.value);
      console.log(
        "到开始遍历时，渲染了多久",
        Date.now() - renderStartTime.value
      );
      setTimeout(
        () => {
          wx.hideLoading();
          isTyping.value = true;
          traverse(curNodes.value.children);
          //默认情况下时typable-text组件中的文本打印完了之后，自动触发滚动，但是有时候，组件内的文本很多，可能要打印几秒甚至更久，这个时候就添加这个定时器，即距离上一次滚动超过一定时间了也触发滚动
          scrollTimer.value = setInterval(() => {
            if (Date.now() - lastScrollTime.value > 600) {
              console.log("定时器驱动滚动了一下");
              if (scrollCb.value) {
                scrollCb.value();
              }
            }
          }, 200);
        },0
      );
    },
    startTyping(resolve) {
      console.log("开始打字效果, 文本:", this.data.text);
      this.clearTimer();
      
      // 如果文本为空，直接完成
      if (!this.data.text || this.data.text.length === 0) {
        console.log("文本为空，跳过打字");
        if (resolve) resolve();
        return;
      }
      
      let index = 0;
      this.setData({ currentText: "" });
      this.data.timer = setInterval(() => {
        if (index < this.data.text.length) {
          this.setData({
            currentText: this.data.text.slice(0, index + 1),
          });
          index++;
        } else {
          this.clearTimer();
          if (resolve) resolve();
        }
      }, this.data.speed);
    },
    clearTimer() {
      if (this.data.timer) {
        clearInterval(this.data.timer);
        this.setData({ timer: null });
      }
    },
  },
});
