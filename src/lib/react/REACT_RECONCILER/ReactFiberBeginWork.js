import {
  NoLanes
} from './ReactFiberLane';

import {
  resolvedDefaultProps
} from './ReactFiberLazyComponent';

import {
  renderWithHooks
} from './ReactFiberHooks';

import {
  mountChildFibers, reconcileChildFibers
} from './ReactChildFiber';
import { ContextProvider, FunctionComponent, HostComponent, HostRoot, HostText, IndeterminateComponent } from './ReactWorkTags';
import { ContentReset, PerformedWork } from './ReactFiberFlags';
import { shouldSetTextContent } from '../DOM/ReactDOMHostConfig';
import { cloneUpdateQueue, processUpdateQueue } from './ReactUpdateQueue';
import { disableModulePatternComponents } from '../shared/ReactFeatureFlags';
import { pushHostContainer, pushHostContext } from './ReactFiberHostContext';
import { pushTopLevelContextObject } from './ReactFiberContext';

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

function UpdateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes) {
  let nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, '', renderLanes);
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
  processUpdateQueue(workInProgress, nexrProps, null, renderLanes);
  const nextState = workInProgress.memoizedState;

  const nextChildren = nextState.element;
  if(nextChildren === prevChildren) {

  }

  const root = workInProgress.stateNode;
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

  }  

  const props = workInProgress.pendingProps;
  let context;
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



function beginWork(current, workInProgress, renderLanes) {
  const updateLanes = workInProgress.lanes;

  if(current !== null) {

  } else {
    didReceiveUpdate = false;
  }
  workInProgress.lanes = NoLanes;

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
      return UpdateFunctionComponent(
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

export {
  beginWork
}