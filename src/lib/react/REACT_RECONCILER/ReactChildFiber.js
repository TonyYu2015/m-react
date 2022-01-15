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

  function updateTextNode(returnFiber, current, textContent, lanes) {
    if(current === null || current.tag !== HostText) {
      // Insert
      const created = createFiberFromText(textContent, returnFiber.mode, lanes);
      created.return = returnFiber;
      return created;
    } else {
      // update
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      return existing;
    }
  }

  function updateElement(returnFiber, current, element, lanes) {
    if(current !== null) {
      if(current.elementType === current.type) {
        // Move based in index
        const existing = useFiber(current, element.props);
        existing.return = returnFiber;
        return existing;
      }
    }

    // Insert
    const created = createFiberFromElement(element, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  function updateSlot(returnFiber, oldFiber, newChild, lanes) {
    const key = oldFiber !== null ? oldFiber.key : null;
    if(typeof newChild === 'string' || typeof newChild === 'number') {
      if(key !== null) {
        return null;
      }
      return updateTextNode(returnFiber, oldFiber, '' + newChild, lanes);
    }

    if(typeof newChild === 'object' && newChild !== null) {
      switch(newChild.$$typeof){
        case REACT_ELEMENT_TYPE:
          if(newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild, lanes);
          } else {
            return null;
          }
      }

      if(Array.isArray(newChild)) {
        if(key !== null) {
          return null;
        }
      }
    }

    return null;
  }

  function placeChild(newFiber, lastPlacedIndex, newIndex) {
    newFiber.index = newIndex;
    if(!shouldTrackSideEffects) {
      return lastPlacedIndex;
    }
    const current = newFiber.alternate;
    if(current !== null) {
      const oldIndex = current.index;
      if(oldIndex < lastPlacedIndex) {
        //  Move
        newFiber.flags = Placement;
        return lastPlacedIndex;
      } else {
        // Stay
        return oldIndex;
      }
    } else {
      // Insert
      newFiber.flags = Placement;
      return lastPlacedIndex;
    }
  }

  function createChild(returnFiber, newChild, lanes) {
    if(typeof newChild === 'string' || typeof newChild === 'number') {
      const created = createFiberFromText('' + newChild, returnFiber.mode, lanes);
      created.return = returnFiber;
      return created;
    }

    if(typeof newChild === 'object' && newChild !== null) {
      switch(newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          const created = createFiberFromElement(newChild, returnFiber.mode, lanes);
          created.return = returnFiber;
          return  created;
      }

      if(Array.isArray(newChild)) {

      }
    }

    return null;
  }

  function mapRemainingChildren(returnFiber, currentFirstChild) {
    const existingChildren = new Map();

    let existingChild = currentFirstChild;
    while(existingChild !== null) {
      if(existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }

      existingChild = existingChild.sibling;
    }

    return existingChildren;
  }

  function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
    if(typeof newChild === 'string' || typeof newChild === 'number') {
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(returnFiber, matchedFiber, '' + newChild, lanes);
    }

    if(typeof newChild === 'object' && newChild !== null) {
      switch(newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          const matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null;
          return updateElement(returnFiber, matchedFiber, newChild, lanes);
      }
    }

    return null;
  }

  function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
    let resultingFirstChild = null;
    let previousNewFiber = null;

    let oldFiber = currentFirstChild;
    let lastPlacedIndex = 0;
    let newIdx = 0;
    let nextOldFiber = null;

    for(; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      if(oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }

      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);

      if(newFiber === null) {
        if(oldFiber === null) {
          oldFiber = nextOldFiber;
        }
        break;
      }

      if(shouldTrackSideEffects) {
        if(oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber);
        }
      }

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if(previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }

      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    // 旧节点长度大于更新的节点长度，所以遍历完新节点之后，删除剩余的旧节点
    if(newIdx === newChildren.length) {
      deleteRemainingChildren(returnFiber, oldFiber);
      return resultingFirstChild;
    }

    // 新节点长度大于旧节点长度，为新更新节点添加更新标记
    if(oldFiber ===  null) {
      for(; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
        if(newFiber === null) {
          continue;
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if(previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }

        previousNewFiber = newFiber;
      }

      return resultingFirstChild;
    }

    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

    // 新旧节点都没遍历完，需要从最后一个可复用的节点开始单独对比处理
    for(; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChildren[newIdx], lanes);

      if(newFiber !== null) {
        if(shouldTrackSideEffects) {
          if(newFiber.alternate !== null) {
            existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key);
          }
        }

        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if(previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    if(shouldTrackSideEffects) {
      existingChildren.forEach(child => deleteChild(returnFiber, child));
    }
    return resultingFirstChild;
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

    if(Array.isArray(newChild)) {
      return reconcileChildrenArray(
        returnFiber,
        currentFirstChild,
        newChild,
        lanes
      );
    }

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