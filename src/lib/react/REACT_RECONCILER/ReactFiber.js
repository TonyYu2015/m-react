import {
  ClassComponent,
  HostComponent,
  IndeterminateComponent,
  HostText
} from './ReactWorkTags';

import {
  NoFlags, StaticMask
} from './ReactFiberFlags';

import {
  NoLanes
} from './ReactFiberLane';

import {
  HostRoot
} from './ReactWorkTags';

import {
  NoMode
} from './ReactTypeOfMode';

function FiberNode(tag, pendingProps, key, mode) {

  // Instance
  this.tag = tag;
  this.key = key;
  this.elementType = null;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;
  this.dependencies = null;
  
  this.mode = mode;

  // Effects
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null;

  this.lanes = NoLanes;
  this.childLanes = NoLanes;

  this.alternate = null;

}

function createFiber(tag, pendingProps, key, mode) {
  return new FiberNode(tag, pendingProps, key, mode);
}

function shouldConstruct(Component) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
  let fiberTag = IndeterminateComponent;
  let resolvedType = type;

  if(typeof type === 'function') {
    if(shouldConstruct(type)) {
      fiberTag = ClassComponent;
    }
  } else if(typeof type === 'string') {
    fiberTag = HostComponent;
  }

  const fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.elementType = type;
  fiber.type = resolvedType;
  fiber.lanes = lanes;

  return fiber;
}

function createFiberFromElement(element, mode, lanes) {
  let owner = null;
  const type = element.type; 
  const key = element.key;
  const pendingProps = element.props;
  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes
  );
  return fiber;
}

function createFiberFromText(content, mode, lanes) {
  const fiber = createFiber(HostText, content, null, mode);
  fiber.lanes = lanes;
  return fiber;
}

function createWorkInProgress(current, pendingProps) {
  let workInProgress = current.alternate;
  if(workInProgress === null) {
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    );

    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    workInProgress.type = current.type;

    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;

    workInProgress.flags = current.flags & StaticMask;
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;

    workInProgress.child = current.child;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;

    const currentDependencies = current.dependencies;
    workInProgress.dependencies = 
      currentDependencies === null 
      ? null 
      : {
        lanes: currentDependencies.lanes,
        firstContext: currentDependencies.firstContext
      };

    workInProgress.sibling = current.sibling;
    workInProgress.index = current.index;
    workInProgress.ref = current.ref;

    return workInProgress;
  }

  workInProgress.flags = current.flags & StaticMask;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  const currentDependencies = current.dependencies;
  workInProgress.dependencies = 
    currentDependencies === null ? null : {
      lanes: currentDependencies.lanes,
      firstContext: currentDependencies.firstContext
    };

  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  return workInProgress;
}

export function createHostRootFiber(tag) {
  let mode;

  mode = NoMode;
  return createFiber(HostRoot, null, null, mode);
}

export {
  createFiberFromText,
  createFiberFromElement,
  createWorkInProgress
}