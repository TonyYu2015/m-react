import { createTextNode, updateProperties } from "./ReactDOMComponent";
import { updateFiberProps } from "./ReactDOMComponentTree";
import { COMMENT_NODE, DOCUMENT_NODE, ELEMENT_NODE } from "./shared/HTMLNodeType";
import { createElement } from './ReactDOMComponent';

export const supportsMutation = true;

export function clearContainer(container) {
  if(container.nodeType === ELEMENT_NODE) {
    container.textContent = '';
  } else if(container.nodeType === DOCUMENT_NODE) {
    const body = container.body;
    if(body != null) {
      body.textContent = '';
    }
  }
}

export function insertInContainerBefore(container, child, beforeChild) {
  if(container.nodeType === COMMENT_NODE) {
    container.parentNode.insertBefore(child, beforeChild);
  } else {
    container.insertBefore(child, beforeChild);
  }
}

export function appendChildToContainer(container, child) {
  let parentNode;
  if(container.nodeType === COMMENT_NODE) {
    parentNode = container.parentNode;
    parentNode.insertBefore(child, container);
  } else {
    parentNode = container;
    parentNode.appendChild(child);
  }
}

export function commitUpdate(domElement, updatePayload, type, oldProps, newProps, internalInstanceHandle) {
  updateFiberProps(domElement, newProps);
  updateProperties(domElement, updatePayload, type, oldProps, newProps);
}

export function appendInitialChild(parentInstance, child) {
  parentInstance.appendChild(child);
}

export function createTextInstance(text, rootContainerInstance, hostContext, internalInstanceHandle) {
  const textNode = createTextNode(text, rootContainerInstance);
  return textNode;
}

export function shouldSetTextContent(type, props) {
  return (
    type === 'textarea' ||
    type === 'option' ||
    type === 'noscript' ||
    typeof props.children === 'string' ||
    typeof props.children === 'number' ||
    (typeof props.dangerouslySetInnerHTML === 'object' &&
      props.dangerouslySetInnerHTML !== null &&
      props.dangerouslySetInnerHTML.__html != null)
  );
}

export function resetAfterCommit(containerInfo) {

}

export function createInstance(type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
  let parentNamespace;

  parentNamespace = hostContext;

  const domElement = createElement(
    type,
    props,
    rootContainerInstance,
    parentNamespace
  );

  updateFiberProps(domElement, props);
  return domElement;
}