Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    nodes: {
      type: Object,
      value: {},
    },
    openTyper: {
      type: Boolean,
      value: false,
    },
    speed: {
      type: Number,
      value: 15,
    },
  },
  observers: {
    openTyper: function (newVal) {
      console.log("[优先处理] openTyper属性变更为:", newVal);
      const { openTyper } = require("./typer");
      openTyper.value = newVal;
    },
    nodes: function (newVal) {
      console.log("towxml接收到nodes:", newVal ? newVal.id : 'undefined');
      
      if (this.properties.openTyper) {
        console.log("打字机效果已开启，速度:", this.properties.speed);
        const {
          curLastLeafNodeId,
          curNodes,
          reset,
          renderStartTime,
          openTyper
        } = require("./typer");
        
        // 确保openTyper.value与properties.openTyper一致
        openTyper.value = this.properties.openTyper;
        console.log("再次确认打字机状态:", openTyper.value);
        
        // 属性值变化时执行的逻辑
        if (newVal && newVal.id) {
          reset();
          console.log("towxml中newVal.id的值", newVal.id, newVal);
          const lastId = this.getLastLeafNodeId(newVal);
          console.log("计算出的最后节点ID:", lastId);
          curLastLeafNodeId.value = lastId;
          console.log("设置curLastLeafNodeId.value为:", curLastLeafNodeId.value);
          curNodes.value = newVal;
          this.data.changeDecode = !this.data.changeDecode;
          this.setData({ changeDecode: this.data.changeDecode });
          console.log("设置changeDecode为:", this.data.changeDecode);
          renderStartTime.value = Date.now();
        }
      }
    }
  },
  lifetimes: {
    created: function() {
      console.log("towxml组件created, openTyper:", this.properties.openTyper);
      const { openTyper } = require("./typer");
      openTyper.value = this.properties.openTyper;
    },
    attached: function () {
      console.log("towxml组件attached, openTyper:", this.properties.openTyper);
      const { openTyper } = require("./typer");
      openTyper.value = this.properties.openTyper;
      const { renderStartTime } = require("./typer");
      renderStartTime.value = Date.now();
    },
    ready: function () {
      console.log(
        "towxml组件ready, openTyper值:",
        this.properties.openTyper
      );
      
      // 最后再确认一次打字机状态
      const { openTyper } = require("./typer");
      openTyper.value = this.properties.openTyper;
      console.log("组件ready时的打字机状态:", openTyper.value);
    },
    detached: function () {
      console.log("towxml组件被移除, 重置typer状态");
      const { reset } = require("./typer");
      reset();
    },
  },
  data: {
    someData: {},
    oldNodes: undefined,
    contentChanged: false,
    changeDecode: false,
  },
  methods: {
    getLastLeafNodeId(nodes) {
      if (!nodes.children || nodes.children.length == 0) {
        return nodes.id;
      } else {
        // 过滤掉无效的节点(如空文本节点)
        const validChildren = nodes.children.filter(child => 
          child && child.id !== undefined && 
          child.id !== null && 
          child.id !== "1.7976931348623157e+308" &&
          !(child.type === "text" && (!child.text || child.text === ""))
        );
        
        if (validChildren.length === 0) {
          return nodes.id;
        }
        
        const lastChild = validChildren[validChildren.length - 1];
        return this.getLastLeafNodeId(lastChild);
      }
    },
  },
});
