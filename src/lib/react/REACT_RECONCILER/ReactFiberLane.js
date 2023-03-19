// Lane优先级-共16个等级
export const SyncLanePriority = 15;
export const SyncBatchedLanePriority = 14;

const InputDiscreteHydrationLanePriority = 13;
export const InputDiscreteLanePriority = 12;

const InputContinuousHydrationLanePriority = 11;
export const InputContinuousLanePriority = 10;

const DefaultHydrationLanePriority = 9;
export const DefaultLanePriority = 8;

const TransitionHydrationPriority = 7;
export const TransitionPriority = 6;

const RetryLanePriority = 5;

const SelectiveHydrationLanePriority = 4;

const IdleHydrationLanePriority = 3;
const IdleLanePriority = 2;

const OffscreenLanePriority = 1;

export const NoLanePriority = 0;

const TotalLanes = 31;


export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane = /*                        */ 0b0000000000000000000000000000001;
export const SyncBatchedLane = /*                 */ 0b0000000000000000000000000000010;

export const InputDiscreteHydrationLane = /*      */ 0b0000000000000000000000000000100;
const InputDiscreteLanes = /*                    */ 0b0000000000000000000000000011000;

const InputContinuousHydrationLane = /*           */ 0b0000000000000000000000000100000;
const InputContinuousLanes = /*                  */ 0b0000000000000000000000011000000;

export const DefaultHydrationLane = /*            */ 0b0000000000000000000000100000000;
export const DefaultLanes = /*                   */ 0b0000000000000000000111000000000;

const TransitionHydrationLane = /*                */ 0b0000000000000000001000000000000;
const TransitionLanes = /*                       */ 0b0000000001111111110000000000000;

const RetryLanes = /*                            */ 0b0000011110000000000000000000000;

export const SomeRetryLane = /*                  */ 0b0000010000000000000000000000000;

export const SelectiveHydrationLane = /*          */ 0b0000100000000000000000000000000;

const NonIdleLanes = /*                                 */ 0b0000111111111111111111111111111;

export const IdleHydrationLane = /*               */ 0b0001000000000000000000000000000;
const IdleLanes = /*                             */ 0b0110000000000000000000000000000;

export const OffscreenLane = /*                   */ 0b1000000000000000000000000000000;

export const NoTimestamp = -1;

let currentUpdateLanePriority = NoLanePriority;


export function getCurrentUpdateLanePriority() {
  return  currentUpdateLanePriority;
}

export function setCurrentUpdateLanePriority(newLanePriority) {
  currentUpdateLanePriority =  newLanePriority;
}

export function mergeLanes(a, b) {
  return a | b;
}

export function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset;
}

export function createLaneMap(initial) {
  // Intentionally pushing one by one.
  // https://v8.dev/blog/elements-kinds#avoid-creating-holes
  const laneMap = [];
  for (let i = 0; i < TotalLanes; i++) {
    laneMap.push(initial);
  }
  return laneMap;
}

export  function markRootFinished(root, remainingLanes) {
  const noLongerPendingLanes = root.pendingLanes & ~remainingLanes;
  root.pendingLanes  =  remainingLanes;

  root.suspendedLanes = 0;
  root.pingedLanes = 0;

  root.expiredLanes &= remainingLanes;
  root.mutableReadLanes  &= remainingLanes;

  root.entangledLanes &= remainingLanes;

  const entanglements = root.entanglements;
  const eventTimes = root.eventTimes;
  const expirationTimes = root.expirationTimes;

    // Clear the lanes that no longer have pending work
    let lanes = noLongerPendingLanes;
    while (lanes > 0) {
      const index = pickArbitraryLaneIndex(lanes);
      const lane = 1 << index;
  
      entanglements[index] = NoLanes;
      eventTimes[index] = NoTimestamp;
      expirationTimes[index] = NoTimestamp;
  
      lanes &= ~lane;
    }
}

export function markRootUpdated(root, updateLane, eventTime) {
  root.pendingLanes |= updateLane;

  const higherPriorityLanes = updateLane - 1;
  root.pingedLanes &= higherPriorityLanes;

  const eventTimes = root.eventTimes;
  const index = laneToIndex(updateLane);

  eventTimes[index] = eventTime;
}

export function markStarvedLanesAsExpired(root, currentTime) {
  const pendingLanes = root.pendingLanes;
  const pingedLanes =  root.pingedLanes;
  const expirationTimes = root.expirationTimes;

  let lanes = pendingLanes;
  while(lanes > 0) {
    const index = pickArbitraryLaneIndex(lanes);
    const lane = 1 << index;

    const expirationTime = expirationTimes[index];
    if(expirationTime === NoTimestamp) {
      if((lane & pingedLanes) !== NoLanes) {
        expirationTimes[index] = computeExpirationTime(lane, currentTime);
      }
    } else if(expirationTime <= currentTime) {
      root.expiredLanes |= lane;
    }
    lanes &= ~lane;
  }

}

export function getNextLanes(root, wipLanes) {
  const pendingLanes = root.pendingLanes;
  if(pendingLanes === NoLanes) {
    return_highestLanePriority = NoLanePriority;
    return NoLanes;
  }

  let nextLanes = NoLanes;
  let nextLanePriority = NoLanePriority;

  const expiredLanes = root.expiredLanes;
  const suspendedLanes = root.suspendedLanes;
  const pingedLanes = root.pingedLanes;

  if(expiredLanes !== NoLanes) {
    nextLanes = expiredLanes;
    nextLanePriority = return_highestLanePriority = SyncLanePriority;
  } else {
    const nonIdlePendingLanes = pendingLanes & NonIdleLanes;
    if(nonIdlePendingLanes !== NoLanes) {
      const nonIdelUnblockedLanes = nonIdlePendingLanes & ~suspendedLanes;
      if(nonIdelUnblockedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(nonIdelUnblockedLanes);
        nextLanePriority = return_highestLanePriority;
      } else {
        const nonIdlePingedLanes  = nonIdlePendingLanes & pingedLanes;
        if(nonIdlePingedLanes !== NoLanes) {
          nextLanes = getHighestPriorityLanes(nonIdlePingedLanes);
          nextLanePriority = return_highestLanePriority;
        }
      }
    } else {
      const unblockedLanes = pendingLanes & ~suspendedLanes;
      if(unblockedLanes !== NoLanes) {
        nextLanes = getHighestPriorityLanes(unblockedLanes);
        nextLanePriority = return_highestLanePriority;
      } else {
        if(pingedLanes !== NoLanes) {
          nextLanes = getHighestPriorityLanes(pingedLanes);
          nextLanePriority = return_highestLanePriority;
        }
      }
    }
   }

   if(nextLanes === NoLanes) {
     return NoLanes;
   }

   nextLanes = pendingLanes & getEqualOrHigherPriorityLanes(nextLanes);

   if(
     wipLanes !== NoLanes
     && wipLanes !== nextLanes
     && (wipLanes & suspendedLanes) === NoLanes
   ) {
     getHighestPriorityLanes(wipLanes);
     const wipLanePriority = return_highestLanePriority;
     if(nextLanePriority <= wipLanePriority) {
       return wipLanes;
     } else {
       return_highestLanePriority = nextLanePriority;
     }
   }

   const entangledLanes = root.entangledLanes;
   if(entangledLanes !== NoLanes) {
     const entanglements = root.entanglements;
     let lanes = nextLanes & entangledLanes;
    while(lanes > 0) {
      const index =  pickArbitraryLaneIndex(lanes);
      const lane = 1 << index;

      nextLanes |= entanglements[index];

      lanes &= ~lane;
    }      
   }

   return nextLanes;
}

export function returnNextLanesPriority() {
  return return_highestLanePriority;
}

function getLowestPriorityLane(lanes) {
  // This finds the most significant non-zero bit.
  const index = 31 - clz32(lanes);
  return index < 0 ? NoLanes : 1 << index;
}

function getEqualOrHigherPriorityLanes(lanes) {
  return (getLowestPriorityLane(lanes) << 1) - 1;
}

function computeExpirationTime(root, currentTime) {
  getHighestPriorityLanes(lane);
  const priority = return_highestLanePriority;
  if(priority >= InputContinuousLanePriority) {
    return currentTime + 250;
  } else if(priority > TransitionPriority) {
    return  currentTime + 5000;
  } else {
    return NoTimestamp;
  }
}

let  return_highestLanePriority = DefaultLanePriority;

function getHighestPriorityLanes(lanes) {
  if ((SyncLane & lanes) !== NoLanes) { 
    return_highestLanePriority = SyncLanePriority;
    return SyncLane;
  }
  if ((SyncBatchedLane & lanes) !== NoLanes) {
    return_highestLanePriority = SyncBatchedLanePriority;
    return SyncBatchedLane;
  }
  if ((InputDiscreteHydrationLane & lanes) !== NoLanes) {
    return_highestLanePriority = InputDiscreteHydrationLanePriority;
    return InputDiscreteHydrationLane;
  }
  const inputDiscreteLanes = InputDiscreteLanes & lanes;
  if (inputDiscreteLanes !== NoLanes) {
    return_highestLanePriority = InputDiscreteLanePriority;
    return inputDiscreteLanes;
  }
  if ((lanes & InputContinuousHydrationLane) !== NoLanes) {
    return_highestLanePriority = InputContinuousHydrationLanePriority;
    return InputContinuousHydrationLane;
  }
  const inputContinuousLanes = InputContinuousLanes & lanes;
  if (inputContinuousLanes !== NoLanes) {
    return_highestLanePriority = InputContinuousLanePriority;
    return inputContinuousLanes;
  }
  if ((lanes & DefaultHydrationLane) !== NoLanes) {
    return_highestLanePriority = DefaultHydrationLanePriority;
    return DefaultHydrationLane;
  }
  const defaultLanes = DefaultLanes & lanes;
  if (defaultLanes !== NoLanes) {
    return_highestLanePriority = DefaultLanePriority;
    return defaultLanes;
  }
  if ((lanes & TransitionHydrationLane) !== NoLanes) {
    return_highestLanePriority = TransitionHydrationPriority;
    return TransitionHydrationLane;
  }
  const transitionLanes = TransitionLanes & lanes;
  if (transitionLanes !== NoLanes) {
    return_highestLanePriority = TransitionPriority;
    return transitionLanes;
  }
  const retryLanes = RetryLanes & lanes;
  if (retryLanes !== NoLanes) {
    return_highestLanePriority = RetryLanePriority;
    return retryLanes;
  }
  if (lanes & SelectiveHydrationLane) {
    return_highestLanePriority = SelectiveHydrationLanePriority;
    return SelectiveHydrationLane;
  }
  if ((lanes & IdleHydrationLane) !== NoLanes) {
    return_highestLanePriority = IdleHydrationLanePriority;
    return IdleHydrationLane;
  }
  const idleLanes = IdleLanes & lanes;
  if (idleLanes !== NoLanes) {
    return_highestLanePriority = IdleLanePriority;
    return idleLanes;
  }
  if ((OffscreenLane & lanes) !== NoLanes) {
    return_highestLanePriority = OffscreenLanePriority;
    return OffscreenLane;
  }

  // This shouldn't be reachable, but as a fallback, return the entire bitmask.
  return_highestLanePriority = DefaultLanePriority;
  return lanes;
}

export function includesSomeLane(a, b) {
  return (a & b) !== NoLanes;
}

export function removeLanes(set, subset) {
  return set & ~subset;
}

function pickArbitraryLaneIndex(lanes)  {
  return 31 - clz32(lanes);
}

function laneToIndex(lane: Lane) {
  return pickArbitraryLaneIndex(lane);
}

const clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;

const log = Math.log;
const LN2 = Math.LN2;
function clz32Fallback(lanes) {
  if (lanes === 0) {
    return 32;
  }
  return (31 - ((log(lanes) / LN2) | 0)) | 0;
}