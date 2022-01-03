import * as Scheduler from '../SCHEDULER/Scheduler'
import { decoupleUpdatePriorityFromScheduler } from '../shared/ReactFeatureFlags';
import { getCurrentUpdateLanePriority, setCurrentUpdateLanePriority, SyncLanePriority } from './ReactFiberLane';

const {
  unstable_runWithPriority: Scheduler_runWithPriority,
  unstable_getCurrentPriorityLevel: Scheduler_getCurrentPriorityLevel,
  unstable_cancelCallback: Scheduler_cancelCallback,
  unstable_scheduleCallback: Scheduler_scheduleCallback,
  unstable_ImmediatePriority: Scheduler_ImmediatePriority,
  unstable_UserBlockingPriority: Scheduler_UserBlockingPriority,
  unstable_NormalPriority: Scheduler_NormalPriority,
  unstable_LowPriority: Scheduler_LowPriority,
  unstable_IdlePriority: Scheduler_IdlePriority,
  unstable_now: Scheduler_now
} = Scheduler;

const fakeCallbackNode = {};
let syncQueue = null;
let immediateQueueCallbackNode = null;
let isFlushingSyncQueue = false;
const initialTimeMs = Scheduler_now();

export const now =
  initialTimeMs < 10000 ? Scheduler_now : () => Scheduler_now() - initialTimeMs;




// Except for NoPriority, these correspond to Scheduler priorities. We use
// ascending numbers so we can compare them like numbers. They start at 90 to
// avoid clashing with Scheduler's priorities.
export const ImmediatePriority = 99;
export const UserBlockingPriority = 98;
export const NormalPriority = 97;
export const LowPriority = 96;
export const IdlePriority = 95;
// NoPriority is the absence of priority. Also React-only.
export const NoPriority = 90;

export function getCurrentPriorityLevel() {
  switch(Scheduler_getCurrentPriorityLevel()) {
    case Scheduler_ImmediatePriority:
      return ImmediatePriority;
    case Scheduler_UserBlockingPriority:
      return UserBlockingPriority;
    case Scheduler_NormalPriority:
      return NormalPriority;
    case Scheduler_LowPriority:
      return LowPriority;
    case Scheduler_IdlePriority:
      return IdlePriority;
    default:
      return 'unknowPriority';
  }
}


function reactPriorityToSchedulerPriority(reactPriorityLevel) {
  switch(reactPriorityLevel) {
    case ImmediatePriority:
      return Scheduler_ImmediatePriority;
    case UserBlockingPriority:
      return Scheduler_UserBlockingPriority;
    case NormalPriority:
      return Scheduler_NormalPriority;
    case LowPriority:
      return Scheduler_LowPriority;
    case IdlePriority:
      return Scheduler_IdlePriority;
    default:
      return 'unknowPriority';
  }
}

export function runWithPriority(reactPriorityLevel, fn) {
  const priorityLevel = reactPriorityToSchedulerPriority(reactPriorityLevel);
  return Scheduler_runWithPriority(priorityLevel, fn);
}

export function scheduleCallback(reactPriorityLevel, callback, options) {
  const priorityLevel = reactPriorityToSchedulerPriority(reactPriorityLevel);
  return Scheduler_scheduleCallback(priorityLevel, callback, options);
}

export function flushSyncCallbackQueue() {
  if(immediateQueueCallbackNode !== null) {
    const node = immediateQueueCallbackNode; 
    immediateQueueCallbackNode = null;
    Scheduler_cancelCallback(node);
  }

  flushSyncCallbackQueueImpl();
}

export function cancelCallback(callbackNode) {
  if(callbackNode !== fakeCallbackNode) {
    Scheduler_cancelCallback(callbackNode);
  }
}

export function scheduleSyncCallback(callback) {
  if(syncQueue === null) {
    syncQueue = [callback];
    immediateQueueCallbackNode = Scheduler_scheduleCallback(
      Scheduler_ImmediatePriority,
      flushSyncCallbackQueueImpl,
    );
  } else {
    syncQueue.push(callback);
  }

  return fakeCallbackNode;
}

function flushSyncCallbackQueueImpl() {
  if(!isFlushingSyncQueue && syncQueue !== null) {
    isFlushingSyncQueue = true;
    let i = 0;
    if(decoupleUpdatePriorityFromScheduler) {
      const previousLanePriority = getCurrentUpdateLanePriority();
      try {
        const isSync = true;
        const queue = syncQueue;
        setCurrentUpdateLanePriority(SyncLanePriority);
        runWithPriority(
          ImmediatePriority,
          () => {
            for(; i < queue.length; i++) {
              let callback = queue[i];
              do{
                callback = callback(isSync);
              } while(callback !== null)
            }
          }
        );
        syncQueue = null;
      } catch(err) {
        
      } finally {
        setCurrentUpdateLanePriority(previousLanePriority);
        isFlushingSyncQueue = false;
      }
    } else {
      try {
        const isSync = true;
        const queue = syncQueue;
        runWithPriority(
          ImmediatePriority,
          () => {
            for(; i < queue.length; i++) {
              let callback = queue[i];
              do{
                callback = callback(isSync);
              } while(callback !== null)
            }
          }
        );
        syncQueue = null;
      } catch(err) {

      } finally {
        isFlushingSyncQueue = false;
      }
    }
    return true;
  } else {
    return false;
  }
}