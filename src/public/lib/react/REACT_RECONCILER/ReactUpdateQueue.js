let hasForceUpdate = false;

function createUpdate(eventTime, lane) {
  const update = {
    eventTime,
    lane,
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

  let pendingQueue = queue.shared.pendingQueue;
  if(pendingQueue !== null) {

  } 

  if(firstBaseUpdate !== null) {

  }
}

export {
  createUpdate,
  enqueueUpdate
}