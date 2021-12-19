import {
  SyncLane,
  NoLanes,
  markRootFinished,
  mergeLanes
} from './ReactFiberLane';

import {
  beginWork
} from './ReactFiberBeginWork';

import {
  runWithPriority,
  getCurrentPriorityLevel,
  ImmediatePriority as ImmediateSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  scheduleCallback,
  flushSyncCallbackQueue
} from './SchedulerWithReactIntegration';
import { BeforeMutationMask, Callback, Deletion, Incomplete, LayoutMask, MutationMask, NoFlags, Passive, PassiveMask, PerformedWork, Placement, PlacementAndUpdate, Snapshot, Update } from './ReactFiberFlags';
import {
  commitBeforeMutationLifeCycles as commitBeforeMutationEffectOnFiber, 
  commitPlacement, 
  commitWork,
  commitLifeCycles as commitLayoutEffectOnFiber,
  recursivelyCommitLayoutEffects
} from './ReactFiberCommitWork';
import {
  completeWork
} from './ReactFiberCompleteWork';
import { resetAfterCommit } from '../DOM/ReactDOMHostConfig';
import { createWorkInProgress } from './ReactFiber';
import ReactCurrentOwner from '../REACT/ReactCurrentOwner';
import { decoupleUpdatePriorityFromScheduler } from '../shared/ReactFeatureFlags';
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
  const prevExecutionContext = executionContext;
  executionContext &= ~BatchedContext;
  executionContext |= LegacyUnbatchedContext;
  try{
    return fn();
  } finally {
    executionContext = prevExecutionContext;
    if(executionContext === NoContext) {

    }
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
  console.log("=====>>>>>afterBeginWork", next);

  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if(next === null) {
    completeUnitWork(unitOfWork);
    console.log("=====>>>>>afterCompleteWork", unitOfWork);
  } else {
    workInProgress = next;
  }

}

function workLoopSync() {
  while(workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function prepareFreshStack(root, lanes) {
  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  workInProgressRoot = root;
  workInProgress = createWorkInProgress(root.current, null);
  workInProgressRootRenderLanes = subtreeRenderLanes = workInProgressRootIncludedLanes = lanes;
  workInProgressRootExitStatus = RootIncomplete;
  workInProgressRootFatalError = null;
  workInProgressRootSkippedLanes = NoLanes;
  workInProgressRootUpdatedLanes = NoLanes;
  workInProgressRootPingedLanes = NoLanes;
}

function renderRootSync(root, lanes) {
  const prevExecutionContext = executionContext;
  executionContext |= RenderContext;
  if(workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }
  do{
    try {
      workLoopSync();
      break;
    } catch (err) {

    }
  } while(true)

  executionContext = prevExecutionContext;
  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  return workInProgressRootExitStatus;
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
  // do{
  //   flushPassiveEffects();
  // } while(rootWithPendingPassiveEffects !== null)
  const finishedWork = root.finishedWork; 
  const lanes = root.finishedLanes;

  if(finishedWork === null) {
    return null;
  }

  root.finishedWork = null;
  root.finishedLanes = NoLanes;


  root.callbackNode = null;

  let remainingLanes =  mergeLanes(finishedWork.lanes, finishedWork.childLanes);
  markRootFinished(root, remainingLanes);

  if(root === workInProgressRoot) {
    workInProgressRoot = null;
    workInProgress = null;
    workInProgressRootRenderLanes = NoLanes;
  }

  const subtreeHasEffects = 
  (
    finishedWork.subtreeFlags  & 
    (
      BeforeMutationMask | MutationMask | LayoutMask | PassiveMask
    )
  ) !== NoFlags;

  const rootHasEffect = (
    finishedWork.flags & (
      BeforeMutationMask | MutationMask | LayoutMask | PassiveMask
    )
  ) !== NoFlags;

  if(subtreeHasEffects || rootHasEffect) {
    let previousLanePriority;

    const prevExecutionContext = executionContext;
    executionContext |= CommitContext;

    ReactCurrentOwner.current = null;

    commitBeforeMutationEffects(finishedWork);

    console.log("====>>>>>beforeMutationt", finishedWork);

    commitMutationEffects(finishedWork, root, renderPriorityLevel);
    console.log("====>>>>>afterMutationt", finishedWork);

  
    resetAfterCommit(root.containerInfo);
    
    root.current = finishedWork;
    
    recursivelyCommitLayoutEffects(finishedWork, root);

    // If there are pending passive effects, schedule a callback to process them.
    if (
      (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
      (finishedWork.flags & PassiveMask) !== NoFlags
    ) {
      if (!rootDoesHavePassiveEffects) {
        rootDoesHavePassiveEffects = true;
        scheduleCallback(NormalSchedulerPriority, () => {
          flushPassiveEffects();
          return null;
        });
      }
    }

    // requestPaint();

    executionContext = prevExecutionContext;
  } else  {
    root.current = finishedWork;
  }

  const rootDidHavePassiveEffects = rootDoseHavePassiveEffects;
  if(rootDoseHavePassiveEffects)  {
    rootDoseHavePassiveEffects = false;
    rootWithPendingPassiveEffects  = root;
    pendingPassiveEffectsLanes  = lanes;
    pendingPassiveEffectsRenderPriority = renderPriorityLevel;
  }

  remainingLanes = root.pendingLanes;

  if(remainingLanes !== NoLanes) {

  }

  if(remainingLanes ===  SyncLane) {

  }

  // ensureRootIsScheduled(root, now());

  if((executionContext & LegacyUnbatchedContext) !== NoContext) {
    return null;
  }

  flushSyncCallbackQueue();

  return null;

}

function  ensureRootIsScheduled(root, currentTime) {

}

export function schedulePassiveEffectCallback() {
  if(!rootDoseHavePassiveEffects) {
    rootDoseHavePassiveEffects = true;
    scheduleCallback(
      NormalSchedulerPriority,
      () => {
        flushPassiveEffects();
        return null;
      }
    );
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

// function commitBeforeMutationEffects() {
//   while(nextEffect !== null) {
//     const current = nextEffect.alternate;

//     const flags = nextEffect.flags;
//     if((flags & Snapshot) !== NoFlags) {
//       commitBeforeMutationEffectOnFiber(current, nextEffect);
//     }

//     if((flags & Passive) !== NoFlags) {
//       if(!rootDoseHavePassiveEffects) {
//         rootDoseHavePassiveEffects = true;
//         scheduleCallback(
//           NormalSchedulerPriority,
//           () => {
//             flushPassiveEffects();
//             return null;
//           }
//         );
//       }
//     }

//     nextEffect = nextEffect.nextEffect;
//   }
// }

function commitBeforeMutationEffectsImpl(fiber) {
  const current = fiber.alternate;
  const flags = current.flags;

  if((flags & Snapshot) !== NoFlags) {
    commitBeforeMutationEffectsOnFiber(current, fiber);
  } 

  if((flags & Passive) !== flags) {
    if(!rootDoseHavePassiveEffects) {
      rootDoseHavePassiveEffects = true;
      scheduleCallback(
        NormalSchedulerPriority,
        () => {
          flushPassiveEffects();
          return null;
        }
      );
    }
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

function commitLayoutEffects(root, committedLanes) {
  while(nextEffect !== null) {
    const flags = nextEffect.flags;
    if(flags & (Update | Callback)) {
      const current = nextEffect.alternate;
      commitLayoutEffectOnFiber(root, current, nextEffect, committedLanes);
    }

    nextEffect = nextEffect.nextEffect;
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
  // lanes = getNextLanes(root, NoLanes);
  lanes = NoLanes;
  existStatus = renderRootSync(root, lanes);

  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
  root.finishedLanes = lanes;
  console.log("====>>>>beforeCommitRoot", root);
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

function detachFiberAfterEffects(fiber) {
  fiber.sibling = null;
  fiber.stateNode = null;
}

export function enqueuePendingPassiveHookEffectMount(fiber, effect) {
  pendingPassiveHookEffectsMount.push(effect, fiber);
  if(!rootDoseHavePassiveEffects) {

  }
}

function flushPassiveEffects() {
  if(pendingPassiveEffectsRenderPriority !== NoSchedulerPriority) {
    const priorityLevel = pendingPassiveEffectsRenderPriority > NormalSchedulerPriority ? 
      NormalSchedulerPriority : pendingPassiveEffectsRenderPriority; 
    pendingPassiveEffectsRenderPriority = NoSchedulerPriority;
    if(decoupleUpdatePriorityFromScheduler) {

    } else {
      runWithPriority(priorityLevel, flushPassiveEffectsImpl);
    }
  }
}

function flushPassiveEffectsImpl() {
  if(rootWithPendingPassiveEffects === null) {
    return false;
  }

  const root = rootWithPendingPassiveEffects;
  const lanes = pendingPassiveEffectsLanes;
  rootWithPendingPassiveEffects = null;
  pendingPassiveEffectsLanes = NoLanes;

  const prevExecutionContext = executionContext; 
  executionContext |= CommitContext;

    // First pass: Destroy stale passive effects.
  const unmountEffects = pendingPassiveHookEffectsUnmount;
  pendingPassiveHookEffectsUnmount = [];
  for(let i = 0; i < unmountEffects.length; i += 2) {
    const effect = unmountEffects[i];
    const fiber = unmountEffects[i + 1];
    const destory = effect.destory;
    effect.destory = undefined;

    if(typeof destory === 'function') {
      try {
        destory()
      } catch(err) {

      }
    }
  }

  // Second pass: Create new passive effects.
  const mountEffects = pendingPassiveHookEffectsMount;
  pendingPassiveHookEffectsMount = [];
  for(let i = 0; i < mountEffects.length; i += 2) {
    const effect = mountEffects[i];
    const fiber = mountEffects[i + 1];
    try {
      const create = effect.create;
      effect.destory = create();
    } catch(err) {

    }
  }
  // Note: This currently assumes there are no passive effects on the root fiber
  // because the root is not part of its own effect list.
  // This could change in the future. 
  let effect = root.current.firstEffect;
  while(effect !== null) {
    const nextNextEffect = effect.nextEffect;
    effect.nextEffect = null;
    if(effect.flags & Deletion) {
      detachFiberAfterEffects(effect);
    }

    effect = nextNextEffect;
  }

  executionContext = prevExecutionContext;

  flushSyncCallbackQueue();

  nestedPassiveUpdateCount =
  rootWithPendingPassiveEffects === null ? 0 : nestedPassiveUpdateCount + 1;

  return true;
}

export {
  unbatchedUpdates,
  requestEventTime,
  requestUpdateLane,
  scheduleUpdateOnFiber
}