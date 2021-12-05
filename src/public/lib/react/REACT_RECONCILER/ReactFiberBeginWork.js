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
  mountChildFibers
} from './ReactChildFiber';
import { FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags';
import { ContentReset, PerformedWork } from './ReactFiberFlags';
import { shouldSetTextContent } from '../DOM/ReactDOMHostConfig';
import { cloneUpdateQueue, processUpdateQueue } from './ReactUpdateQueue';

let didReceiveUpdate = false;

function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
  if(workInProgress === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren, renderLanes);
  }
}

function UpdateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes) {
  let nextChildren = renderWithHooks(current, workInProgress, Component, nextProps, '', renderLanes);
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}

function updateHostRoot(current, workInProgress, renderLanes) {
  // pushHostRootContext(workInProgress);
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
  // pushHostContext(workInProgress);
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



function beginWork(current, workInProgress, renderLanes) {
  const updateLanes = workInProgress.lanes;

  if(current !== null) {

  } else {
    didReceiveUpdate = false;
  }
  workInProgress.lanes = NoLanes;

  switch(workInProgress.tag) {
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