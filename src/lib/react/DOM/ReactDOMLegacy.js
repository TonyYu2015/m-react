import {
  ReactDOMRoot
} from '../REACT_RECONCILER/ReactFiberRoot';

import {
  unbatchedUpdates
} from '../REACT_RECONCILER/ReactFiberWorkLoop'

import {
  updateContainer
} from '../REACT_RECONCILER/ReactFiberReconciler';
import { createLegacyRoot } from './ReactDOMRoot';

function legacyCreateRootFromDomContainer(container) {
  return createLegacyRoot(container);
}

export function render(children, container) {
  // 省略legacyRenderSubtreeIntoContainer方法 直接进入legacy模式
  let root = container._reactRootContainer;
  let fiberRoot;
  if(!root) {
    // 首次渲染
    // 通过container创建 3个全局变量，并互相关联
    // 1、ReactDOMBlockRoot
    // 2、FiberRoot
    // 3、HostRootFiber
    // 互相关系以及与container的关系：
    //   三者与container之间的关系
    //   container._reactRootContainer = ReactDOMBlockRoot；
    //   container[随记key] = HostRootFiber；
    //   FiberRoot.containerInfo = container;
    //   三者之间的关系
    //   ReactDOMBlockRoot._internalRoot = FiberRoot；
    //   FiberRoot.current = HostRootFiber；
    //   HostRootFiber.stateNode = FiberRoot;
    root = container._reactRootContainer = legacyCreateRootFromDomContainer(container);
    fiberRoot = root._internalRoot;
    unbatchedUpdates(() => {
      updateContainer(children, fiberRoot);
    });
  } else {
    // 后续更新，一般用的不多
    updateContainer();
  }
}