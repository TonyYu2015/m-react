> 本项目主要目的是对react源码的学习，版本为17.0.2中的新版，涉及代码均跟主流程相关，省略了很多代码，例如：开发环境的、服务端的渲染、合成事件、concurrent模式等等。
> 参考文章 [图解 React 源码系列](https://github.com/7kms/react-illustration-series)、[React技术揭秘](https://react.iamkasong.com/)
1. ## 整体流程 
  ![flow](./asserts/imgs/basicFlow.jpg)

2. ## 基础概念
   1. [Fiber结构](./src/lib/react/REACT_RECONCILER/ReactFiber.js)
      - HostRootFiber(根Fiber)
   2. [FiberRoot](./src/lib/react/REACT_RECONCILER/ReactFiberRoot.js)
   3. 
3. ## Render阶段
   1. ### beginwork
      - #### reconcileChildren函数（）
    1. ### completeWork 
4. ## Commit阶段
   1. beforeMutation
   2. mutation
   3. afterMutation
5. ## 调度中心(Scheduler)
6. ## Hooks流程
   1. 状态Hook
   2. 副作用Hook
7. ## 优先级模型
8. ## 调度逻辑