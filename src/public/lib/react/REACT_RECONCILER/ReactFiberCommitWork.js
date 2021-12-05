import { appendChildToContainer, clearContainer, commitUpdate, insertInContainerBefore, supportsMutation } from "../DOM/ReactDOMHostConfig";
import { Placement, Snapshot } from "./ReactFiberFlags";
import { ClassComponent, DehydratedFragment, HostComponent, HostPortal, HostRoot, HostText } from "./ReactWorkTags";

export function commitBeforeMutationLifeCycles(current, finishedWork) {
  switch(finishedWork.tag) {
    case ClassComponent:
      if(finishedWork.flags & Snapshot) {
        if(current !== null) {
          
        }
      }
      return;
    case HostComponent:
      if(supportsMutation) {
        if(finishedWork.flags & Snapshot) {
          const root = finishedWork.stateNode;
          clearContainer(root.containerInfo);
        }
      }
      return;
    default:
      return;
  }
}

function getHostParentFiber(fiber) {
  let parent = fiber.return;
  while(parent !== null) {
    if(isHostParent(parent)) {
      return parent;
    }
    parent = parent.return;
  }
}

function isHostParent(fiber) {
  return (
    fiber.tag === HostComponent ||
    fiber.tag === HostRoot ||
    fiber.tag === HostPortal
  )
}

function getHostSibling(fiber) {
  let node = fiber;
  siblings: while(true) {
    while(node.sibling == null) {
      if(node.return === null || isHostParent(node.return)) {
        return null;
      }
      node = node.return;
    }

    node.sibling.return = node.return;
    node = node.sibling;
    while(
      node.tag !== HostComponent &&
      node.tag !== HostText &&
      node.tag !== DehydratedFragment
    ) {
      if(node.flags & Placement) {
        continue siblings;
      } else {
        node.child.return = node;
        node = node.child;
      }
    }

    if(!(node.flags & Placement)) {
      return node.stateNode;
    }
  }
}

function commitPlacement(finishedWork) {
  if(!supportsMutation) {
    return;
  }

  const parentFiber = getHostParentFiber(finishedWork);
  let parent;
  let isContainer;
  const parentStateNode = parentFiber.stateNode;
  switch(parentFiber.tag) {
    case HostComponent:
      parent = parentStateNode;
      isContainer = false;
      break;
    case HostRoot:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;
    default:
      alert('非法parentFiber');
  }

  const before = getHostSibling(finishedWork);

  if(isContainer) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
  } else {

  }
}

function insertOrAppendPlacementNodeIntoContainer(node, before,  parent) {
  const {tag} = node;
  const isHost = tag === HostComponent || tag === HostText;
  if(isHost) {
    const stateNode = isHost ? node.stateNode : node.stateNode.instance;
    if(before) {
      insertInContainerBefore(parent, stateNode, before);
    } else {
      appendChildToContainer(parent, stateNode);
    }
  } else if(tag === HostPortal) {

  } else {
    const child = node.child;
    if(child !== null) {
      insertOrAppendPlacementNodeIntoContainer(child, before, parent);
      let sibling = child.sibling;
      while(sibling !== null) {
        insertOrAppendPlacementNodeIntoContainer(sibling, before, parent);
        sibling = sibling.sibling;
      }
    }
  }
}

function commitWork(current, finishedWork) {
  if(!supportsMutation) {

  }

  switch(finishedWork.tag) {
    case HostComponent:
      const instance = finishedWork.stateNode;
      if(instance !== null) {
        const newProps = finishedWork.memoizedProps;
        const oldProps = current !== null ? current.memoizedProps : newProps;
        const type = finishedWork.type;
        const updatePayload = finishedWork.updateQueue;
        finishedWork.updateQueue = null;
        if(updatePayload !== null) {
          commitUpdate(
            instance,
            updatePayload,
            type,
            oldProps,
            newProps,
            finishedWork
          );
        }
      }
  }
}

export {
  commitPlacement,
  commitWork
}