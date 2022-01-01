
const setTimeout = window.setTimeout;
const clearTimeout = window.clearTimeout;

let isMessageLoopRunning = false;
let scheduledHostCallback = null;
let taskTimeoutID = -1;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
let yieldInterval = 5;
let deadline = 0;

// TODO: Make this configurable
// TODO: Adjust this based on priority?
const maxYieldInterval = 300;
let needsPaint = false;

export function requestHostTimeout(callback, ms) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime());
  }, ms);
}

export function cancelHostTimeout() {
  clearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

export let getCurrentTime;
const hasPerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';
if(hasPerformanceNow) {
  const localPerformance = performance;
  getCurrentTime = () => localPerformance.now();
} else {
  const localDate = Date;
  const initialTime = localDate.now();
  getCurrentTime = () => localDate.now() - initialTime;
}

export function shouldYieldToHost() {
  return false;
  // return getCurrentTime() >= deadline;
}

export function requestPaint() {}

function performWorkUntilDeadline() {
  if(scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    deadline = currentTime + yieldInterval;
    const hasTimeRemaining = true;
    try {
      const hasMoreWork = scheduledHostCallback(
        hasTimeRemaining,
        currentTime
      );
      
      if(!hasMoreWork) {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      } else {
        port.postMessage(null);
      }

    } catch(err) {
      port.postMessage(null);
    }
  } else {
    isMessageLoopRunning = false;
  }

  needsPaint = false;
}

const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

export function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if(!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    port.postMessage(null);
  }
}

export function cancelHostCallback() {
  scheduledHostCallback = null;
}

