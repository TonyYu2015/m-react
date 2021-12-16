import { createHostRootFiber } from "./ReactFiber";
import { NoLanes } from "./ReactFiberLane";
import { initializedUpdateQueue } from "./ReactUpdateQueue";

export function FiberRootNode(containerInfo, tag) {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pendingChildren = null;
  this.current = null;
  this.pingCache = null;
  this.finishedWork = null;
  // this.timeoutHandle = noTimeout;
  this.context = null;
  this.pendingContext = null;
  this.callbackNode = null;
  // this.callbackPriority = NoLanePriority;
  // this.eventTimes = createLaneMap(NoLanes);
  // this.expirationTimes = createLaneMap(NoTimestamp);

  this.pendingLanes = NoLanes;
  this.suspendedLanes = NoLanes;
  this.pingedLanes = NoLanes;
  this.expiredLanes = NoLanes;
  this.mutableReadLanes = NoLanes;
  this.finishedLanes = NoLanes;

  this.entangledLanes = NoLanes;
  // this.entanglements = createLaneMap(NoLanes);


  // if (enableSchedulerTracing) {
  //   this.interactionThreadID = unstable_getThreadID();
  //   this.memoizedInteractions = new Set();
  //   this.pendingInteractionMap = new Map();
  // }
}

export function createFiberRoot(containerInfo, tag) {
  const root = new FiberRootNode(containerInfo, tag);
  const uninitializedFiber = createHostRootFiber(tag);
  root.current = uninitializedFiber;
  uninitializedFiber.stateNode = root;
  initializedUpdateQueue(uninitializedFiber);
  return root;
}