import { createContainer } from '../REACT_RECONCILER/ReactFiberReconciler';
import {
  FiberRootNode
} from '../REACT_RECONCILER/ReactFiberRoot';

import {
  LegacyRoot
} from '../REACT_RECONCILER/ReactRootTags';
import { markContainerAsRoot } from './ReactDOMComponentTree';


function ReactDOMRoot () {
  this._internalRoot = new FiberRootNode();
}

function ReactDOMBlockRoot(container, tag, options) {
  this._internalRoot = createRootImpl(container, tag, options);
}

function createRootImpl(container, tag, options) {
  const root = createContainer(container, tag);
  markContainerAsRoot(root.current, container);
  const containerNodeType = container.nodeType; 

  return root;
}

export function createLegacyRoot(container, options) {
  return new ReactDOMBlockRoot(container, LegacyRoot, options);
}

export {
  ReactDOMRoot
}