import { appendChildToContainer, clearContainer, commitUpdate, getPublicInstance, insertInContainerBefore, supportsMutation } from "../DOM/ReactDOMHostConfig";
import { Callback, LayoutMask, NoFlags, PassiveMask, Placement, Snapshot, Update } from "./ReactFiberFlags";
import { enqueuePendingPassiveHookEffectMount, schedulePassiveEffectCallback } from "./ReactFiberWorkLoop";
import { commitUpdateQueue } from "./ReactUpdateQueue";
import { ClassComponent, DehydratedFragment, FunctionComponent, HostComponent, HostPortal, HostRoot, HostText } from "./ReactWorkTags";

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

export function commitLifeCycles(finishedRoot, current, finishedWork, committedLanes) {
  switch(finishedWork.tag) {
    case FunctionComponent: {
      commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);

      schedulePassiveEffects(finishedWork);
      return;
    }
    case HostRoot: {
      const updateQueue = finishedWork.updateQueue;
      if(updateQueue !== null) {
        let instance = null;
        if(finishedWork.child !== null) {
          switch(finishedWork.child.tag) {
            case HostComponent:
              instance = getPublicInstance(finishedWork.child.stateNode);
              break;
          }
        }
        commitUpdateQueue(finishedWork, updateQueue, instance);
      }
      return;
    }
    case HostComponent: {
      const instance = finishedWork.stateNode;
      if(current === null && finishedWork.flags & Update) {
        const type = finishedWork.type;
        const props = finishedWork.memoizedProps;
        // commitMount(instance, type, props, finishedWork);
      }

      return;
    }
    case HostText:
      return;
  }
}

function schedulePassiveEffects(finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if(lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do{
      const {next, tag} = effect;
      if(
        (tag & HookPassive) !== NoHookEffect &&
        (tag & HookHasEffect) !== NoHookEffect
      ) {
        // enqueuePendingPassiveHookEffectUnmount(finishedWork, effect);
        enqueuePendingPassiveHookEffectMount(finishedWork, effect);
      }

      effect = next;
    } while(effect !== firstEffect)
  }
}

export function recursivelyCommitLayoutEffects(finishedWork, finishedRoot) {
  const {flags, tag} = finishedWork;
  switch(tag) {
    default:  
      let child =  finishedWork.child;
      while(child !== null) {
        const primarySubtreeFlags = finishedWork.subtreeFlags &  LayoutMask;
        if(primarySubtreeFlags !== NoFlags) {
          recursivelyCommitLayoutEffects(child, finishedRoot);
        }

        child = child.sibling;
      }

      const primaryFlags = flags & (Update | Callback);
      if(primaryFlags !== NoFlags) {
        switch(tag) {
          case FunctionComponent:
            commitHookEffectListMount(HookLayout | HookHasEffect, finishedWork);
            if((finishedWork.subtreeFlags & PassiveMask) !== NoFlags) {
              schedulePassiveEffectCallback();
            }
            break;
          case HostRoot:
            commitLayoutEffectsForHostRoot(finishedWork);
            break;
        }
      }
  }
}

function commitHookEffectListMount(flags, finishedWork) {
  const updateQueue = finishedWork.updateQueue;
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;

  if(lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;

    do{
      if((effect.tag & flags) === flags) {
        const create = effect.create;
        effect.destroy = create();
      }
      effect = effect.next;
    } while(effect !== firstEffect)
  }
}

function commitLayoutEffectsForHostRoot(finishedWork) {
  const update = finishedWork.update;
  if(update !== null) {
    let  instance  = null;
    if(finishedWork.child !== null) {
      switch(finishedWork.child.tag) {
        case HostComponent:
          instance = getPublicInstance(finishedWork.child.stateNode);
          break;
      }
    }
    commitUpdateQueue(finishedWork, updateQueue, instance);
  }
}

export {
  commitPlacement,
  commitWork
}