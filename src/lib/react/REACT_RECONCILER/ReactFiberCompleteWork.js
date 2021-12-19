import { appendInitialChild, createInstance, createTextInstance } from "../DOM/ReactDOMHostConfig";
import { NoFlags, Snapshot, StaticMask } from "./ReactFiberFlags";
import { getHostContext, getRootHostContainer, popHostContainer, pushHostContainer, pushHostContext } from "./ReactFiberHostContext";
import { mergeLanes, NoLane, NoLanes } from "./ReactFiberLane";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./ReactWorkTags";

function updateHostContainer(current, workInProgress) {
  // Noop
}

function appendAllChildren(parent, workInProgress, needsVisibilityToggle, isHidden) {
  const node = workInProgress.child;
  while(node !== null) {
    if(node.tag === HostComponent || node.tag === HostText) {
      appendInitialChild(parent, node.stateNode);
    } else if(node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if(node === workInProgress) {
      return;
    }

    while(node.sibling === null) {
      if(node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
  }
}

function bubbleProperties(completedWork) {
  const didBailout = 
    completedWork.alternate !== null &&
    completedWork.alternate.child === completedWork.child;

  let newChildLanes = NoLanes;
  let subtreeFlags = NoFlags;

  if(!didBailout) {
    let child = completedWork.child;
    while(child !== null) {
      newChildLanes = mergeLanes(
        newChildLanes,
        mergeLanes(child.lanes, child.childLanes)
      );

      subtreeFlags |= child.subtreeFlags;
      subtreeFlags |= child.flags;

      child = child.sibling;

      completedWork.subtreeFlags |= subtreeFlags;
    }
  } else {
    let child = completedWork.child;
    while (child !== null) {
      newChildLanes = mergeLanes(
        newChildLanes,
        mergeLanes(child.lanes, child.childLanes),
      );

      subtreeFlags |= child.subtreeFlags & StaticMask;
      subtreeFlags |= child.flags & StaticMask;

      child = child.sibling;
    }
    completedWork.subtreeFlags |= subtreeFlags;
  }

  completedWork.childLanes =  newChildLanes;
  return didBailout;
}

export function completeWork(current, workInProgress, renderLanes) {
  const newProps = workInProgress.pendingProps;
  switch(workInProgress.tag) {
    case HostRoot: {
      popHostContainer(workInProgress);

      const fiberRoot = workInProgress.stateNode;
      if(fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext;
        fiberRoot.pendingContext = null;
      }

      if(current === null || current.child === null) {
        workInProgress.flags |= Snapshot;
      }

      updateHostContainer(current, workInProgress);
      bubbleProperties(workInProgress);
      return null;
    }

    case HostComponent:  {
      pushHostContext(workInProgress);
      const rootContainerInstance = getRootHostContainer();
      const type = workInProgress.type;
      if(current !== null && workInProgress.stateNode != null) {

      } else {
        const currentHostContext = getHostContext();
        const instance = createInstance(
          type,
          newProps,
          rootContainerInstance,
          currentHostContext,
          workInProgress
        );
        appendAllChildren(instance, workInProgress, false, false);
        workInProgress.stateNode = instance;
        // if(
        //   finalizeInitialChildren(instance, type, newProps, rootContainerInstance, currentHostContext)
        //   ) {
        //     markUpdate(workInProgress);
        //   }
      }
      bubbleProperties(workInProgress);
      return null;
    }

    case FunctionComponent:
      bubbleProperties(workInProgress);
      return null;
    case HostText:
      const newText = newProps;
      if(current && workInProgress.stateNode !== null) {

      } else {
        const rootContainerInstance = getRootHostContainer();
        const currentHostContext = getHostContext();

        workInProgress.stateNode = createTextInstance(
          newText,
          rootContainerInstance,
          currentHostContext,
          workInProgress
        );
      }
      bubbleProperties(workInProgress);
      return null;;
  }
}