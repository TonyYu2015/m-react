import {
  NoLanes
} from './ReactFiberLane'


let renderLanes = NoLanes;
let currentlyRenderingFiber = null;

function renderWithHooks(current, workInProgress, Component, props, secondArg, nextRenderLanes) {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

  let children = Component(props, secondArg);

  return children;
}

export {
  renderWithHooks
}