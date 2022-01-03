import { markWorkInProgressReceivedUpdate } from "./ReactFiberBeginWork";
import { includesSomeLane } from "./ReactFiberLane";


let currentlyRenderingFiber = null;
let lastContextDependency = null;
let lastContextWithAllBitsObserved = null;

export function prepareToReadContext(workInProgress, renderLanes) {
  currentlyRenderingFiber = workInProgress;
  lastContextDependency = null;
  lastContextWithAllBitsObserved = null;

  const dependencies = workInProgress.dependencies;
  if(dependencies !== null) {
    const firstContext = dependencies.firstContext;
    if(firstContext !== null) {
      if(includesSomeLane(dependencies.lanes, renderLanes)) {
        markWorkInProgressReceivedUpdate();
      }
      dependencies.firstContext = null;
    }
  }
}