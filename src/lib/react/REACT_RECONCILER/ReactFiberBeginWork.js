import {
  includesSomeLane,
  NoLanes
} from './ReactFiberLane';

import {
  resolvedDefaultProps
} from './ReactFiberLazyComponent';

import {
  bailoutHooks,
  renderWithHooks
} from './ReactFiberHooks';

import {
  cloneChildFibers,
  mountChildFibers, reconcileChildFibers
} from './ReactChildFiber';
import { ContextProvider, FunctionComponent, HostComponent, HostRoot, HostText, IndeterminateComponent } from './ReactWorkTags';
import { ContentReset, ForceUpdateForLegacySuspense, NoFlags, PerformedWork, Placement } from './ReactFiberFlags';
import { shouldSetTextContent } from '../DOM/ReactDOMHostConfig';
import { cloneUpdateQueue, processUpdateQueue } from './ReactUpdateQueue';
import { disableModulePatternComponents } from '../shared/ReactFeatureFlags';
import { pushHostContainer, pushHostContext } from './ReactFiberHostContext';
import { pushTopLevelContextObject } from './ReactFiberContext';
import { markSkippedUpdateLanes } from './ReactFiberWorkLoop';
import { prepareToReadContext } from './ReactFiberNewContext';

let didReceiveUpdate = false;

function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
  if(current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderLanes);
  } else {
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes
    );
  }
}

function pushHostRootContext(workInProgress) {
  const root = workInProgress.stateNode;

  if(root.pendingContext) {
    pushTopLevelContextObject(
      workInProgress,
      root.pendingContext,
      root.pendingContext !== root.context
    )
  } else {
    pushTopLevelContextObject(workInProgress, root.context, false);
  }

  pushHostContainer(workInProgress, root.containerInfo);
}

function updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes) {
  let context;
  prepareToReadContext(workInProgress, renderLanes);
  let nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, '', renderLanes);
  if(current !== null && !didReceiveUpdate) {
    bailoutHooks(current, workInProgress, renderLanes);
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostRoot(current, workInProgress, renderLanes) {
  pushHostRootContext(workInProgress);
  const updateQueue = workInProgress.updateQueue;
  const nexrProps = workInProgress.pendingProps;
  const prevState = workInProgress.memoizedState;
  const prevChildren = prevState !== null ? prevState.element: null;
  cloneUpdateQueue(current, workInProgress);
  // 处理更新队列事物
  processUpdateQueue(workInProgress, nexrProps, null, renderLanes);
  const nextState = workInProgress.memoizedState;

  const nextChildren = nextState.element;
  if(nextChildren === prevChildren) {
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  }

  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;

}

function updateHostComponent(current, workInProgress, renderLanes) {
  pushHostContext(workInProgress);
  const type = workInProgress.type;
  const nextProps = workInProgress.pendingProps;
  const prevProps = current !== null ? current.memoizedProps : null;

  let nextChildren = nextProps.children;
  const isDirectTextChild = shouldSetTextContent(type, nextProps);

  if(isDirectTextChild) {
    nextChildren = null;
  } else if(prevProps !== null && shouldSetTextContent(type, prevProps)) {
    workInProgress.flags |= ContentReset;
  }

  workInProgress.flags |= PerformedWork;
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostText(current, workInProgress) {
  return null;
}

function mountIndeterminateComponent(_current, workInProgress, Component, renderLanes) {
  if(_current !== null) {
    _current.alternate = null;
    workInProgress.alternate = null;
    workInProgress.flags |= Placement;
  }  

  const props = workInProgress.pendingProps;
  let context;

  prepareToReadContext(workInProgress, renderLanes);
  let value;
  value = renderWithHooks(
    null,
    workInProgress,
    Component,
    props,
    context,
    renderLanes
  );

  workInProgress.flags |= PerformedWork;

  if(
    !disableModulePatternComponents &&
    typeof value === 'object' &&
    value !== null &&
    typeof value.render === 'function' &&
    value.$$typeof === undefined
  ) {

  } else {
    workInProgress.tag = FunctionComponent;
    reconcileChildren(null, workInProgress, value, renderLanes);
    return workInProgress.child;
  }
}

function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
  if(current !== null) {
    workInProgress.dependencies = current.dependencies;
  }

  markSkippedUpdateLanes(workInProgress.lanes);

  if(!includesSomeLane(renderLanes, workInProgress.childLanes)) {
    return null;
  } else {
    cloneChildFibers(current, workInProgress);
    return  workInProgress.child;
  }

}


function beginWork(current, workInProgress, renderLanes) {
  const updateLanes = workInProgress.lanes;

  // 更新过程中，current不为null
  if(current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;
    // 比较新旧props
    if(oldProps !== newProps) {
      // 当前fiber需要更新
      didReceiveUpdate = true;
    } else if(!includesSomeLane(renderLanes, updateLanes)) {
      didReceiveUpdate = false;
      switch(workInProgress.tag) {
        case HostRoot: {
          pushHostRootContext(workInProgress);
          break;
        }
        case HostComponent:
          pushHostContext(workInProgress);
          break;
      }

      // 判断子fiber是否需要更新
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    } else {
      if((current.flags & ForceUpdateForLegacySuspense) !== NoFlags) {
        didReceiveUpdate = true;
      } else {
        didReceiveUpdate = false;
      }
    }
  } else {
    didReceiveUpdate = false;
  }

  // 重制当前过程fiber优先级
  workInProgress.lanes = NoLanes;

  // 针对不同的fiber类型进行更新
  switch(workInProgress.tag) {
    case IndeterminateComponent:
      return mountIndeterminateComponent(
        current,
        workInProgress,
        workInProgress.type,
        renderLanes,
      );
    case FunctionComponent:
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps = 
        workInProgress.elementType === Component 
          ? unresolvedProps
          : resolvedDefaultProps(Component, unresolvedProps);
      // 执行Function组件
      return updateFunctionComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes
      );
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
  }

}

export function markWorkInProgressReceivedUpdate() {
  didReceiveUpdate = true;
}

export {
  beginWork
}