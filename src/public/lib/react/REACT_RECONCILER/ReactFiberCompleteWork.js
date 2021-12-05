import { appendInitialChild, createInstance, createTextInstance } from "../DOM/ReactDOMHostConfig";
import { Snapshot } from "./ReactFiberFlags";
import { getHostContext, getRootHostContainer } from "./ReactFiberHostContext";
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

export function completeWork(current, workInProgress, renderLanes) {
  const newProps = workInProgress.pendingProps;
  switch(workInProgress.tag) {
    case HostRoot:
      const fiberRoot = workInProgress.stateNode;
      if(fiberRoot.pendingContext) {
        fiberRoot.context = fiberRoot.pendingContext;
        fiberRoot.pendingContext = null;
      }

      if(current === null || current.child === null) {
        workInProgress.flags |= Snapshot;
      }

      updateHostContainer(current, workInProgress);
      return null;
    case HostComponent:
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
      }

      return null;
    case FunctionComponent:
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
      return null;;
  }
}