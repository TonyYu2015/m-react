import ReactCurrentDispatcher from '../REACT/src/ReactCurrentDispatcher';
import {
  NoLanes
} from './ReactFiberLane'
import { requestEventTime, requestUpdateLane, scheduleUpdateOnFiber } from './ReactFiberWorkLoop';
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
          update.eagerState = currentState;
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

  return children;
}

export {
  renderWithHooks
}