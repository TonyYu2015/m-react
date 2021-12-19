import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from './SchedulerPriorities';


let currentPriorityLevel = NormalPriority;

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