import {
  createFiberFromElement,
  createFiberFromText,
  createWorkInProgress
} from './ReactFiber';

import {
  REACT_ELEMENT_TYPE, 
  REACT_PORTAL_TYPE,
  REACT_LAZY_TYPE
} from '../shared/ReactSymbols';
import { Deletion, Placement } from './ReactFiberFlags';
import { HostText } from './ReactWorkTags';

function ChildReconciler(shouldTrackSideEffects) {

  function deleteChild(returnFiber, childToDelete) {
    if(!shouldTrackSideEffects) {
      return null;
    }

    const deletions = returnFiber.deletions;
    if(deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= Deletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  function deleteRemainingChildren(returnFiber, currentFirstChild) {
    if(!shouldTrackSideEffects) {
      return null;
    }

    let childToDelete = currentFirstChild;
    while(childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }

  function useFiber(fiber, pendingProps) {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  function reconileSingleTextNode(returnFiber, currentFirstChild, textContent, lanes) {
    if(currentFirstChild !== null && currentFirstChild.tag === HostText) {
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
      const existing = useFiber(currentFirstChild, textContent);
      existing.return = returnFiber;
      return existing;
    }

    deleteRemainingChildren(returnFiber, currentFirstChild);
    const created = createFiberFromText(textContent, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  function reconcileSingleElement(returnFiber, currentFirstChild, element, lanes) {
    const key = element.key; 
    const child = currentFirstChild;

    while(child !== null) {
      if(child.key === key) {
        switch(child.tag) {
          default:
            if(child.elementType === element.type) {
              deleteRemainingChildren(returnFiber, child.sibling);
              const existing = useFiber(child, element.props);
              existing.return = returnFiber;
              return existing;
            }
        }
        deleteRemainingChildren(returnFiber, child);
        break;
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    const created = createFiberFromElement(element, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  function placeSingleChild(newFiber) {
    // 添加placement flag TODO
    if(shouldTrackSideEffects  && newFiber.alternate === null) {
      newFiber.flags |= Placement;
    }
    return newFiber;
  }

  function reconcileChildFibers(returnFiber, currentFirstChild, newChild, lanes) {
    // 根据newChild的数据类型来分别处理
    const isObject = typeof newChild === 'object' && newChild !== null;
    if(isObject) {
      switch(newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: 
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes
            )
          );
        // case REACT_PORTAL_TYPE:
        // case REACT_LAZY_TYPE:
      }
    }

    if(typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(
        reconileSingleTextNode(
          returnFiber,
          currentFirstChild,
          '' + newChild,
          lanes
        )
      )
    }

    // if(Array.isArray(newChild)) {
    //   return reconcileChildrenArray(
    //     returnFiber,
    //     currentFirstChild,
    //     newChild,
    //     lanes
    //   );
    // }

    // 迭代类型的TODO
    // 还有些错误处理

    // 其余的都当作空来处理
    return deleteRemainingChildren(returnFiber, currentFirstChild);
  }

  return reconcileChildFibers;
}

const mountChildFibers = ChildReconciler(false);
export const reconcileChildFibers = ChildReconciler(true);

export function cloneChildFibers(current, workInProgress) {
  if(workInProgress.child === null) {
    return;
  }

  let currentChild = workInProgress.child;
  let newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
  workInProgress.child = newChild;
  newChild.return = workInProgress;
  while(currentChild.sibling !== null) {
    currentChild = currentChild.sibling;
    newChild = newChild.sibling = createWorkInProgress(
      currentChild,
      currentChild.pendingProps
    );
    newChild.return = workInProgress;
  }
  newChild.sibling = null;
}

export {
  mountChildFibers
}