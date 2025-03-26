const typeShowCbMap = { value: {} };
const curLastLeafNodeId = { value: undefined };
const curNodes = { value: undefined };
const scrollCb = { value: undefined };
const isTyping = { value: false };
const openTyper = { value: false };
const lastScrollTime = { value: 0 };
const scrollTimer = { value: undefined };
const renderStartTime = { value: 0 };

async function traverse(nodes) {
  //只有正在执行打字的时候，才执行，如果还没打完，就要切换新的文章进行打字，就可以通过这个变量终止旧的递归
  if (!isTyping.value) {
    console.log("打字遍历被中断");
    return;
  }
  
  console.log("开始遍历节点：", nodes);
  
  if (!nodes || !Array.isArray(nodes)) {
    console.warn("无效的节点数组：", nodes);
    return;
  }
  
  let index = 0;
  for (const node of nodes) {
    if (!node) {
      console.warn("节点为空，跳过");
      continue;
    }
    
    console.log(`处理节点[${index}]:`, node.id, node);
    
    await new Promise((resolve) => {
      if (typeShowCbMap.value[node.id]) {
        console.log(`执行节点[${node.id}]的回调函数`);
        typeShowCbMap.value[node.id](resolve, index);
      } else {
        console.log(`节点[${node.id}]没有回调函数，直接完成`);
        resolve();
      }
      
      if (scrollCb.value) {
        console.log("执行滚动回调");
        scrollCb.value();
      }
      
      if (node.id == curLastLeafNodeId.value) {
        console.log("所有的节点都渲染完毕，进行reset");
        reset();
      }
    });
    
    //执行完了之后，就删除回调函数，减少内存占用
    delete typeShowCbMap.value[node.id];
    index++;
    
    //光在上面终止是没有用的，因为这是深度优先的递归，还要终止回溯的过程，这里是用来终止回溯
    if (!isTyping.value) {
      console.log("打字遍历被中断（回溯过程）");
      return;
    }
    
    if (node.noType == false && node.children && node.children.length > 0) {
      console.log(`遍历节点[${node.id}]的子节点`);
      await traverse(node.children);
    }
  }
}

function reset() {
  console.log("重置打字机状态");
  typeShowCbMap.value = {};
  curLastLeafNodeId.value = undefined;
  curNodes.value = undefined;
  isTyping.value = false;
  openTyper.value = false;
  lastScrollTime.value = 0;
  renderStartTime.value = 0
  clearInterval(scrollTimer.value);
  scrollTimer.value = undefined;
}

module.exports = {
  typeShowCbMap,
  traverse,
  curLastLeafNodeId,
  curNodes,
  scrollCb,
  reset,
  openTyper,
  lastScrollTime,
  scrollTimer,
  isTyping,
  renderStartTime
};
