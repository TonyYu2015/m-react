import { 
  requestHostCallback,
  cancelHostCallback,
  shouldYieldToHost,
  getCurrentTime
 } from './SchedulerHostConfig';
import {
  push,
  peek,
  pop
} from './SchedulerMinHeap';
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from './SchedulerPriorities';

// Max 31 bit integer. The max integer size in V8 for 32-bit systems.
// Math.pow(2, 30) - 1
// 0b111111111111111111111111111111
var maxSigned31BitInt = 1073741823;

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

var isHostTimeoutScheduled = false;

// Tasks are stored on a min heap
var taskQueue = [];
var timerQueue = [];

// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;

// Pausing the scheduler is useful for debugging.
var isSchedulerPaused = false;

var currentTask = null;
var currentPriorityLevel = NormalPriority;

// This is set while performing work, to prevent re-entrancy.
var isPerformingWork = false;

var isHostCallbackScheduled = false;

function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel;
}

function unstable_runWithPriority(priorityLevel, eventHandle) { 
  switch(priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
    case LowPriority:
    case IdlePriority:
      break;
    default:
      priorityLevel = NormalPriority;
  }

  let previousPriorityLevel = currentPriorityLevel;
  currentPriorityLevel = priorityLevel;

  try {
    return eventHandle();
  } finally {
    currentPriorityLevel = previousPriorityLevel;
  }
}

function unstable_scheduleCallback(priorityLevel, callback, options) {
  var currentTime = getCurrentTime();
  var startTime;
  if(typeof options === 'object' &&  options !== null) {
    var delay = options.delay;
    if(typeof delay ===  'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  var timeout;
  switch(priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }

  var expirationTime = startTime + timeout;

  var newTask = {
    id:  taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1
  };

  if(startTime > currentTime) {
    // newTask.sortIndex = startTime;
    // push(timerQueue, newTask);
    // if(peek(taskQueue) === null && newTask === peek(timerQueue)) {
    //   if(isHostTimeoutScheduled) {
    //     cancelHostTimeout();
    //   } else {
    //     isHostTimeoutScheduled = true;
    //   }

    //   requestHostTimeout(handleTimeout, startTime - currentTime);
    // }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    if(!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}

function flushWork(hasTimeRemaining, initialTime) {
  isHostCallbackScheduled = false;
  // if(isHostTimeoutScheduled) {
  //   isHostTimeoutScheduled = false;
  //   cancelHostTimeout();
  // }

  isPerformingWork = true;
  const  previousPriorityLevel = currentPriorityLevel;
  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;

  }
}

function workLoop(hasTimeRemaining,  initialTime) {
  let currentTime = initialTime;
  // advanceTimers(currentTime);
  currentTask = peek(taskQueue);
  while(
    currentTask !== null
  ) {
    if(currentTask.expirationTime > currentTime && (!hasTimeRemaining || shouldYieldToHost())) {
      break;
    }

    const callback = currentTask.callback;
    if(typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      if(typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback;
      } else {
        if(currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      // advanceTimers(currentTime);
    } else {
      pop(taskQueue);
    }
    
    currentTask = peek(taskQueue);
  }

  if(currentTask !== null) {
    return true;
  } else {
    return false;
  }
}

export function unstable_cancelCallback(task) {
  task.callback = null;
}

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority,
  unstable_getCurrentPriorityLevel,
  unstable_runWithPriority,
  unstable_scheduleCallback
}