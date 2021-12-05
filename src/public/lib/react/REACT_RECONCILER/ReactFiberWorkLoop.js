import {
  SyncLane,
  NoLanes
} from './ReactFiberLane';

import {
  beginWork
} from './ReactFiberBeginWork';

import {
  runWithPriority,
  getCurrentPriorityLevel,
  ImmediatePriority as ImmediateSchedulerPriority
} from './SchedulerWithReactIntegration';
import { BeforeMutationMask, Incomplete, LayoutMask, MutationMask, NoFlags, Passive, PassiveMask, Placement, PlacementAndUpdate, Snapshot, Update } from './ReactFiberFlags';
import {
  commitBeforeMutationLifeCycles as commitBeforeMutationEffectsOnFiber, commitPlacement, commitWork
} from './ReactFiberCommitWork';
import {
  completeWork
} from './ReactFiberCompleteWork';
import { resetAfterCommit } from '../DOM/ReactDOMHostConfig';

let rootDoseHavePassiveEffects = false;

export const NoContext = /*             */ 0b0000000;
const BatchedContext = /*               */ 0b0000001;
const EventContext = /*                 */ 0b0000010;
const DiscreteEventContext = /*         */ 0b0000100;
const LegacyUnbatchedContext = /*       */ 0b0001000;
const RenderContext = /*                */ 0b0010000;
const CommitContext = /*                */ 0b0100000;

const RootIncomplete = 0;
const RootFatalErrored = 1;
const RootErrored = 2;
const RootSuspended = 3;
const RootSuspendedWithDelay = 4;
const RootCompleted = 5;

// Describes where we are in the React execution stack
let executionContext = NoContext;
// The root we're working on
let workInProgressRoot = null;
// The fiber we're working on
let workInProgress = null;
// The lanes we're rendering
let workInProgressRootRenderLanes = NoLanes;

// Stack that allows components to change the render lanes for its subtree
// This is a superset of the lanes we started working on at the root. The only
// case where it's different from `workInProgressRootRenderLanes` is when we
// enter a subtree that is hidden and needs to be unhidden: Suspense and
// Offscreen component.
//
// Most things in the work loop should deal with workInProgressRootRenderLanes.
// Most things in begin/complete phases should deal with subtreeRenderLanes.
export let subtreeRenderLanes = NoLanes;
// const subtreeRenderLanesCursor: StackCursor<Lanes> = createCursor(NoLanes);

// Whether to root completed, errored, suspended, etc.
let workInProgressRootExitStatus = RootIncomplete;
// A fatal error, if one is thrown
let workInProgressRootFatalError = null;
// "Included" lanes refer to lanes that were worked on during this render. It's
// slightly different than `renderLanes` because `renderLanes` can change as you
// enter and exit an Offscreen tree. This value is the combination of all render
// lanes for the entire render phase.
let workInProgressRootIncludedLanes = NoLanes;
// The work left over by components that were visited during this render. Only
// includes unprocessed updates, not work in bailed out children.
let workInProgressRootSkippedLanes = NoLanes;
// Lanes that were updated (in an interleaved event) during this render.
let workInProgressRootUpdatedLanes = NoLanes;
// Lanes that were pinged (in an interleaved event) during this render.
let workInProgressRootPingedLanes = NoLanes;

let mostRecentlyUpdatedRoot = null;

// The most recent time we committed a fallback. This lets us ensure a train
// model where we don't commit new loading states in too quick succession.
let globalMostRecentFallbackTime = 0;
const FALLBACK_THROTTLE_MS = 500;

// The absolute time for when we should start giving up on rendering
// more and prefer CPU suspense heuristics instead.
let workInProgressRootRenderTargetTime = Infinity;
// How long a render is supposed to take before we start following CPU
// suspense heuristics and opt out of rendering more content.
const RENDER_TIMEOUT_MS = 500;

// Used to avoid traversing the return path to find the nearest Profiler ancestor during commit.
let nearestProfilerOnStack = null;

function unbatchedUpdates(fn) {
  try{
    return fn();
  } finally {

  }
}

function requestEventTime() {
  return new Date().getTime();
}

function requestUpdateLane() {
  return SyncLane;
}

function markUpdateLaneFromFiberToRoot(sourceFiber, lane) {
  let node = sourceFiber;
  let parent = sourceFiber.return;
  while(parent !== null) {
    node = parent;
    parent = parent.return;
  }
  return node.stateNode;
}

function completeUnitWork(unitOfWork) {
  let completedWork = unitOfWork;
  do{
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    if((completedWork.flags & Incomplete) === NoFlags) {
      let next = completeWork(current, completedWork, subtreeRenderLanes);
      if(next !== null) {
        workInProgress = null;
        return;
      }
    } else {

    }

    const siblingFiber = completedWork.sibling;
    if(siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    } 
    completedWork = returnFiber;
    workInProgress = completedWork;

  } while(completedWork !== null);
}

function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;

  let next = beginWork(current, unitOfWork);

  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if(next === null) {
    completeUnitWork(unitOfWork);
  } else {
    workInProgress = next;
  }

}

function workLoopSync() {
  while(workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function renderRootSync(root, lanes) {
  do{
    try {
      workLoopSync();
    } catch (err) {

    }
  } while(true)
}

function commitRoot(root) {
  const renderPriorityLevel = getCurrentPriorityLevel();
  runWithPriority(
    ImmediateSchedulerPriority,
    commitRootImpl.bind(null, root, renderPriorityLevel)
  );
  return null;
}

function commitRootImpl(root, renderPriorityLevel) {
  const finishedWork = root.finishedWork; 
  const lanes = root.finishedLanes;

  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  root.callbackNode = null;

  if(root === workInProgressRoot) {
    workInProgressRoot = null;
    workInProgress = null;
    workInProgressRootRenderLanes = NoLanes;
  }

  const subTreeHasEffects = (
    finishedWork.subtreeFlags & 
    (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)
  ) !== NoFlags;
  const rootHasEffect = (
    finishedWork.flags &
    (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)
  ) !== NoFlags;

  if(subTreeHasEffects || rootHasEffect) {
    // 渲染前
    commitBeforeMutationEffects(finishedWork);

    // 渲染
    commitMutationEffects(finishedWork, root, renderPriorityLevel);

    // 渲染后
    resetAfterCommit(root.containerInfo);

    root.current = finishedWork;
  } else {
    // No Effects
    root.current = finishedWork;

  }
}

function commitBeforeMutationEffects(firstChild) {
  let fiber = firstChild;
  // 递归处理fiber
  while(fiber !== null) {
    // if(fiber.deletions !== null) {
    //   commitBeforeMutationEffectsDeletions(fiber.deletions);
    // }
    if(fiber.child !== null) {
      const primarySubtreeFlags = fiber.subtreeFlags & BeforeMutationMask;
      if(primarySubtreeFlags !== NoFlags) {
        commitBeforeMutationEffects(fiber.child);
      }
    }

    try {
      commitBeforeMutationEffectsImpl(fiber);
    } catch(e) {
      
    }

    fiber = fiber.sibling;
  }
}

function commitBeforeMutationEffectsImpl(fiber) {
  const current = fiber.alternate;
  const flags = current.flags;

  if((flags & Snapshot) !== NoFlags) {
    commitBeforeMutationEffectsOnFiber(current, fiber);
  } 

  if((flags & Passive) !== flags) {
    // if(!rootDoseHavePassiveEffects) {
    //   rootDoseHavePassiveEffects = true;

    // }
  }

}

function commitMutationEffects(firstChild, root, renderPriorityLevel) {
  let fiber = firstChild;
  while(fiber !== null) {
    if(fiber.child !== null) {
      const mutationFlags = fiber.subtreeFlags & MutationMask;
      if(mutationFlags !== NoFlags) {
        commitMutationEffects(fiber.child, root, renderPriorityLevel);
      }
    }

    try{
      commitMutationEffectsImpl(fiber, root, renderPriorityLevel);
    } catch(e) {

    }
    fiber = fiber.sibling;
  }
}

function commitMutationEffectsImpl(fiber, root, renderPriorityLevel) {
  const flags = fiber.flags;
  const primaryFlags = flags & (Placement | Update);
  switch(primaryFlags) {
    case Placement:
      commitPlacement(fiber);
      fiber.flags &= ~Placement;
      break;
    case PlacementAndUpdate:
      {
        commitPlacement(fiber);
        fiber.flags &= ~Placement;
        const current = root.alternate;
        commitWork(current, fiber);
        break;
      }
    case Update: {
      const current = root.alternate;
      commitWork(current, fiber);
      break;
    }
  }
}

// function commitBeforeMutationEffectsDeletions(deletions) {
//   for(let i = 0; i < deletions.length; i++) {
//     const fiber = deletions[i];

//   }
// }

function performSyncWorkOnRoot(root) {
  // flushPassiveEffects();
  let lanes;
  let existStatus;
  existStatus = renderRootSync(root, lanes);

  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  root.finishedLanes = lanes;

  commitRoot(root);

  return null;
}

function scheduleUpdateOnFiber(fiber, lane, eventTime) {
  const root = markUpdateLaneFromFiberToRoot(fiber, lane);
  // markRootUpdated(root, lane, eventTime);
  const priorityLevel = getCurrentPriorityLevel();
  if(lane === SyncLane) {
    if(
      (executionContext & LegacyUnbatchedContext) !== NoContext &&
      (executionContext & (RenderContext | CommitContext)) === NoContext
    ) {
      performSyncWorkOnRoot(root, lane);
    } else {
      // ensureRootIsScheduled(root, eventTime);
    }
  }
}

export {
  unbatchedUpdates,
  requestEventTime,
  requestUpdateLane,
  scheduleUpdateOnFiber
}