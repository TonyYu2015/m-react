import { DidCapture, ShouldCapture } from "./ReactFiberFlags";
import { NoLanes } from "./ReactFiberLane";

let hasForceUpdate = false;

export const UpdateState = 0;
export const ReplaceState = 1;
export const ForceUpdate = 2;
export const CaptureUpdate = 3;

function createUpdate(eventTime, lane) {
  const update = {
    eventTime,
    lane,
    tag: UpdateState,
    payload: null,
    next: null
  }

  return update;
}

function enqueueUpdate(fiber, update) {
  const updateQueue = fiber.updateQueue;
  if(updateQueue === null) {
    return;
  }

  const sharedQueue = updateQueue.shared;
  const pending = sharedQueue.pending;
  if(pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }

  sharedQueue.pending = update;
}

export function initializedUpdateQueue(fiber) {
  const queue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
      pending: null
    },
    effects: null
  }

  fiber.updateQueue = queue;
}

export function cloneUpdateQueue(current, workInProgress) {
  const queue = workInProgress.updateQueue;
  const currentQueue = current.updateQueue;
  if(queue === currentQueue) {
    const clone = {
      baseState: currentQueue.baseState,
      firstBaseUpdate: currentQueue.firstBaseUpdate,
      lastBaseUpdate: currentQueue.lastBaseUpdate,
      shared: currentQueue.shared,
      effects: currentQueue.effects
    }
    workInProgress.updateQueue = clone;
  }

}

export function processUpdateQueue(workInProgress, props, instance, renderLanes) {
  const queue = workInProgress.updateQueue;
  hasForceUpdate = false;

  let firstBaseUpdate = queue.firstBaseUpdate;
  let lastBaseUpdate = queue.lastBaseUpdate;

  let pendingQueue = queue.shared.pending;
  if(pendingQueue !== null) {
    queue.shared.pending = null;
    // 剪开pendingQueue(触发了的更新), 并对接baseUpdate
    // if lastBaseUpdate exist, then connect the firstPendingUpdate to the lastBaseUpdate or
    // assign the firstPendingUpdate to the firstBaseUpdate
    const lastPendingUpdate = pendingQueue;
    const firstPendingUpdate = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    if(lastBaseUpdate === null) {
      firstBaseUpdate = firstPendingUpdate;
    } else {
      lastBaseUpdate.next = firstPendingUpdate; 
    }
    lastBaseUpdate = lastPendingUpdate;

    const current = workInProgress.alternate;
    if(current !== null) {
      // the same logic as connect the pendingQueue to the baseUpdateQueue
      const currentQueue = current.updateQueue;
      const currentLastBaseUpdate = currentQueue.lastBaseUpdate;
      if(currentLastBaseUpdate !== lastBaseUpdate) {
        if(currentLastBaseUpdate === null) {
          currentQueue.firstBaseUpdate = firstPendingUpdate;
        } else {
          currentLastBaseUpdate.next = firstPendingUpdate;
        }
         currentQueue.lastBaseUpdate = lastPendingUpdate;
      }
    }
  } 
  // after the logic above, the two updateQueues in the current and workInProgress will like this:
  // current: firstBaseUpdate -> lastBaseUpdate -> firstPendingUpdate -> lastPendingUpdate
  // workInProgress: firstBaseUpdate -> lastBaseUpdate -> firstPendingUpdate -> lastPendingUpdate

  if(firstBaseUpdate !== null) {
    let newState = queue.baseState;
    let newLanes = NoLanes;

    let newBaseState = null;
    let newFirstBaseUpdate = null;
    let newLastBaseUpdate = null;

    let update = firstBaseUpdate;
    do{
      const updateLane = update.lane;
      const updateEventTime = update.eventTime;
      // if(!isSubsetOfLanes(renderLanes,  updateLane)) {
      if(false) {

      } else {
        if(newLastBaseUpdate !== null) {

        }

        newState = getStateFromUpdate(workInProgress, queue, update, newState, props, instance);
        const callback = update.callback;
        if(callback !== null) {

        }
      }

      update = update.next;
      if(update === null) {
        pendingQueue = queue.shared.pending;
        if(pendingQueue === null) {
          break;
        } else {

        }
      }
    } while(true);

    if(newLastBaseUpdate === null) {
      newBaseState = newState;
    }

    queue.baseState = newBaseState;
    queue.firstBaseUpdate = newFirstBaseUpdate;
    queue.lastBaseUpdate = newLastBaseUpdate;

    // markSkippedUpdateLanes(newLanes);
    workInProgress.lanes = newLanes;
    workInProgress.memoizedState = newState;
  }
}

function getStateFromUpdate(workInProgress, queue, update, prevState, nextProps, instance) {
  switch(update.tag) {
    case ReplaceState: {
      const payload = update.payload; 
      if(typeof payload === 'function') {
        const nextState = payload.call(instance, prevState, nextProps);
        return nextState;
      }
      return payload;
    }
    case CaptureUpdate: {
      workInProgress.flags = (workInProgress.flags & ~ShouldCapture) | DidCapture;
    }
    case UpdateState: {
      const payload = update.payload;
      let partialState;
      if(typeof payload === 'function') {
        partialState = payload.call(instance, prevState, nextProps);
      } else {
        partialState = payload;
      }

      if(partialState === null || partialState === undefined) {
        return prevState;
      }

      return Object.assign({}, prevState, partialState);
    }
    case ForceUpdate: {
      hasForceUpdate = true;
      return prevState;
    }
  }

  return prevState;
}

export function commitUpdateQueue(finishedWork, finishedQueue, instance) {
  const effects = finishedQueue.effects;
  finishedQueue.effects = null;
  if(effects !== null) {
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      const callback = effect.callback;
      if (callback !== null) {
        effect.callback = null;
        callCallback(callback, instance);
      }
    }
  }
}

function callCallback(callback, context) {
  callback.call(context);
}

export {
  createUpdate,
  enqueueUpdate
}