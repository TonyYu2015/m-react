# React Source Code Learn
> This project is just the record of my learning load on React source code, new files of 17.0.2 version.
> Reference articles:  [图解 React 源码系列](https://github.com/7kms/react-illustration-series)、[React技术揭秘](https://react.iamkasong.com/)
## Brief process 
  ![flow](./asserts/imgs/flow.svg)

1. ## Basic Concept
   1. [Fiber Structure](./src/lib/react/REACT_RECONCILER/ReactFiber.js)
      - HostRootFiber(Root Fiber)
   2. [FiberRoot](./src/lib/react/REACT_RECONCILER/ReactFiberRoot.js)
2. ## Reconciler
      - ### Render Stage
         1. ### Beginwork
            - #### reconcileChildren函数（）
         2. ### CompleteWork 
      - ### Commit Stage
         1. beforeMutation
         2. mutation
         3. afterMutation
4. ## Scheduler
5. ## Hooks
   1. [Theory of Hooks](doc/HOOKS/theoryOfHooks.md)
   2. [State Hook](./doc/HOOKS/setNewState.md)
   3. [Effect Hook](doc/HOOKS/effectRun.md)
6. ## Priority