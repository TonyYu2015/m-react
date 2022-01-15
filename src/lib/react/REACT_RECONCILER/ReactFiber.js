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
  this.tag = tag; // Fiber的类型
  this.key = key; // 等同于ReactElement的key
  this.elementType = null;  // 一般情况下等同于type
  this.type = null; // 各个组件
  this.stateNode = null; // 一般对应界面上的dom节点

  // Fiber
  this.return = null; // 父Fiber
  this.child = null; // 子Fiber
  this.sibling = null; // 兄弟Fiber
  this.index = 0;

  this.ref = null;

  this.pendingProps = pendingProps; // 需要更新的props
  this.memoizedProps = null; // 当前的props
  this.updateQueue = null; // 更新队列
  this.memoizedState = null; // 当前的状态， Function类型的话是Hooks链表
  this.dependencies = null;
  
  this.mode = mode; // legacy，block，concurrent

  // Effects 针对hooks
  this.flags = NoFlags; // 当前Fiber的副作用
  this.subtreeFlags = NoFlags; // 子Fiber的副作用
  this.deletions = null; // 删除

  this.lanes = NoLanes; // 当前节点的更新优先级
  this.childLanes = NoLanes; // 子Fiber的更新优先级

  this.alternate = null; // 双缓冲技术内的两个Fiber节点的映射

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
    // 无当前过程fiber时直接创建
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode
    );

    // 将当前界面状态复制到当前过程fiber上，下面也一样
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