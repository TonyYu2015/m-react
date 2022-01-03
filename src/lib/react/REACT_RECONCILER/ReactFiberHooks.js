import ReactCurrentDispatcher from '../REACT/src/ReactCurrentDispatcher';
import {
  isSubsetOfLanes,
  mergeLanes,
  NoLane,
  NoLanes,
  removeLanes
} from './ReactFiberLane'
import { markSkippedUpdateLanes, requestEventTime, requestUpdateLane, scheduleUpdateOnFiber } from './ReactFiberWorkLoop';
import is from '../shared/objectIs';

import {
  Update as UpdateEffect,
  Passive as PassiveEffect,
  PassiveStatic as PassiveStaticEffect,
  MountLayoutDev as MountLayoutDevEffect,
  MountPassiveDev as MountPassiveDevEffect,
} from './ReactFiberFlags';
import {
  HasEffect as HookHasEffect,
  Layout as HookLayout,
  Passive as HookPassive,
} from './ReactHookEffectTags';
import { markWorkInProgressReceivedUpdate } from './ReactFiberBeginWork';

let renderLanes = NoLanes;
let currentlyRenderingFiber = null;
let currentHook = null;
let workInProgressHook = null;
let didScheduleRenderPhaseUpdate = false;
let didScheduleRenderPhaseUpdateDuringThisPass = false;
const RE_RENDER_LIMIT  = 25;


const HooksDispatcherOnMount = {
  useEffect: mountEffect,
  useState: mountState,
};

const HooksDispatcherOnUpdate = {
  useState: updateState,
  useReducer: updateReducer,
  useEffect: updateEffect
};

function dispatchAction(fiber, queue, action) {
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(fiber);

  const update = {
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: null
  };

  const pending = queue.pending;
  if(pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }

  queue.pending = update;
  
  const alternate =  fiber.alternate;
  if(
    fiber === currentlyRenderingFiber ||
    (alternate !== null && alternate ===  currentlyRenderingFiber)
  ) {
    didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
  } else {
    if(
      fiber.lanes === NoLanes
      && (alternate === null || alternate.lanes === NoLanes)
    ) {
      const lastRenderedReducer = queue.lastRenderedReducer;
      if(lastRenderedReducer !== null) {
        try {
          let currentState = queue.lastRenderedState;
          const eagerState = lastRenderedReducer(currentState, action);
          update.eagerReducer = lastRenderedReducer;
          update.eagerState = eagerState;
          if(is(eagerState, currentState)) {
            return;
          }
        } catch(err) {

        }
      }
    }
    scheduleUpdateOnFiber(fiber, lane, eventTime);
  }
}

function basicStateReducer(state, action) {
  return typeof action === 'function' ? action(state) : action;
}

function mountState(initialState) {
  const hook = mountWorkInProgressHook();
  if(typeof initialState ===  'function') {
    initialState = initialState();
  }

  hook.memoizedState = hook.baseState = initialState;
  const queue = hook.queue  = {
    pending:  null,
    dispatch: null,
    lastRenderedReducer: basicStateReducer,
    lastRenderedState: initialState
  };

  const dispatch = queue.dispatch = dispatchAction.bind(null, currentlyRenderingFiber, queue);

  return [hook.memoizedState, dispatch];
}

function updateState(initialState) {
  return updateReducer(basicStateReducer, initialState);
}

function updateReducer(reducer, initialArg, init) {
  const hook = updateWorkInProgressHook();
  const queue = hook.queue;

  queue.lastRenderedReducer = reducer;
  const current = currentHook;
  let baseQueue = current.baseQueue;
  const pendingQueue = queue.pending;
  if(pendingQueue !== null) {
    if(baseQueue !== null) {
      const baseFirst = baseQueue.next;
      const pendingFirst = pendingQueue.next;
      baseQueue.next = pendingFirst;
      pendingFirst.next = baseFirst;
    }

    current.baseQueue = baseQueue = pendingQueue;
    queue.pending = null;
  }

  if(baseQueue !== null) {
    const first = baseQueue.next;
    let newState = current.baseState;

    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let update = first;
    do{
      const updateLane = update.lane;
      if(!isSubsetOfLanes(renderLanes, updateLane)) {
        const clone = {
          lane: updateLane,
          action: update.action,
          eagerReducer: update.eagerReducer,
          eagerState: update.eagerState,
          next: null
        };
        if(newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }

        currentlyRenderingFiber.lanes = mergeLanes(
          currentlyRenderingFiber.lanes,
          updateLane
        );
        markSkippedUpdateLanes(updateLane);
      } else {
        if(newBaseQueueLast !== null) {
          const clone = {
            lane: NoLane,
            action: update.action,
            eagerReducer: update.eagerReducer,
            eagerState: update.eagerState,
            next: null
          };
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }

        if(update.eagerReducer === reducer) {
          newState = update.eagerState;
        } else {
          const action = update.action;
          newState = reducer(newState, action);
        }
      }

      update = update.next;
    } while(update !== null && update !== first);

    if(newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
    }

    if(!is(newState, hook.memoizedState)) {
      markWorkInProgressReceivedUpdate();
    }

    hook.memoizedState = newState;
    hook.baseState = newBaseState;
    hook.baseQueue = newBaseQueueLast;

    queue.lastRenderedState = newState;
  }

  const dispatch = queue.dispatch;
  return [hook.memoizedState, dispatch];
}

function  mountEffect(create, deps) {
  return mountEffectImpl(
    PassiveEffect | PassiveStaticEffect,
    HookPassive,
    create,
    deps
  );
}

function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  );
}

function pushEffect(tag, create, destory, deps) {
  const effect = {
    tag,
    create,
    destory,
    deps,
    next: null
  };
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue;
  if(componentUpdateQueue ===  null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = componentUpdateQueue;
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    effect = componentUpdateQueue.lastEffect;
    if(lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}

function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}

function  updateEffectImpl(fiberFlags, hookFlags, create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destory = undefined
  if(currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destory = prevEffect.destory;
    if(nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      if(areHookInputsEqual(nextDeps, prevDeps)) {
        pushEffect(hookFlags, create, destory, nextDeps);
        return;
      }
    }
  }

  currentlyRenderingFiber.flag |=  fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destory,
    nextDeps
  );
}

function areHookInputsEqual(nextDeps, prevDeps) {
  if(prevDeps === null) {
    return false;
  }

  for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
    if (is(nextDeps[i], prevDeps[i])) {
      continue;
    }
    return false;
  }
  return true;
}

function createFunctionComponentUpdateQueue() {
  return {
    lastEffect: null
  }
}

function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null
  };

  if(workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    workInProgressHook = workInProgressHook.next = hook;
  }

  return workInProgressHook;
}

function updateWorkInProgressHook() {
  let nextCurrentHook;
  if(currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    if(current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }

  let nextWorkInProgressHook;
  if(workInProgressHook === null) {
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else {
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if(nextWorkInProgressHook !== null) {
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    currentHook = nextCurrentHook;
  } else {
    currentHook = nextCurrentHook;
    const newHook = {
      memoizedState: currentHook.memoizedState,

      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,

      next: null,
    }

    if(workInProgressHook === null) {
      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }

  return workInProgressHook;
}
 
function renderWithHooks(current, workInProgress, Component, props, secondArg, nextRenderLanes) {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

  ReactCurrentDispatcher.current = 
    current === null || current.memoizedState ===  null ? 
      HooksDispatcherOnMount : HooksDispatcherOnUpdate;

  let children = Component(props, secondArg);

  renderLanes = NoLanes;
  currentlyRenderingFiber = null;

  currentHook = null;
  workInProgressHook = null;

  didScheduleRenderPhaseUpdate = false;

  return children;
}

export function bailoutHooks(current, workInProgress, lanes) {
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.flags &= ~(PassiveEffect | UpdateEffect);
  current.lanes = removeLanes(current.lanes, lanes);
}

export {
  renderWithHooks
}