import { createContainer } from '../REACT_RECONCILER/ReactFiberReconciler';
import {
  FiberRootNode
} from '../REACT_RECONCILER/ReactFiberRoot';

import {
  LegacyRoot
} from '../REACT_RECONCILER/ReactRootTags';
import { enableEagerRootListeners } from '../shared/ReactFeatureFlags';
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
  // const containerNodeType = container.nodeType; 

  // if (enableEagerRootListeners) {
  //   const rootContainerElement =
  //     container.nodeType === COMMENT_NODE ? container.parentNode : container;
  //   listenToAllSupportedEvents(rootContainerElement);
  // } else {
  //   if (
  //     containerNodeType !== DOCUMENT_FRAGMENT_NODE &&
  //     containerNodeType !== DOCUMENT_NODE
  //   ) {
  //     ensureListeningTo(container, 'onMouseEnter', null);
  //   }
  // }

  return root;
}

export function createLegacyRoot(container, options) {
  return new ReactDOMBlockRoot(container, LegacyRoot, options);
}

export {
  ReactDOMRoot
}