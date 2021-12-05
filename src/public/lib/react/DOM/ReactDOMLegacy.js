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
    root = container._reactRootContainer = legacyCreateRootFromDomContainer(container);
    fiberRoot = root._internalRoot;
    unbatchedUpdates(() => {
      updateContainer(children, fiberRoot);
    });
  } else {
    // 后续更新
    updateContainer();
  }
}