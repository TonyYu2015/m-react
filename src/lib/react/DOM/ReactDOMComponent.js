import { setValueForProperty } from "./DOMPropertyOperations";
import setTextContent from "./setTextContent";
import { setValueForStyles } from "./shared/CSSPropertyOperations";
import { getIntrinsicNamespace, Namespaces } from "./shared/DOMNamespaces";
import { DOCUMENT_NODE } from "./shared/HTMLNodeType";
import isCustomComponent from "./shared/isCustomComponent";

const DANGEROUSLY_SET_INNER_HTML = 'dangerouslySetInnerHTML';
const SUPPRESS_CONTENT_EDITABLE_WARNING = 'suppressContentEditableWarning';
const SUPPRESS_HYDRATION_WARNING = 'suppressHydrationWarning';
const AUTOFOCUS = 'autoFocus';
const CHILDREN = 'children';
const STYLE = 'style';
const HTML = '__html';

const {html: HTML_NAMESPACE} = Namespaces;

export function updateProperties(domElement, updatePayload, tag, lastRawProps, nextRawProps) {
  const wasCustomComponentTag = isCustomComponent(tag, lastRawProps);
  const isCustomComponentTag = isCustomComponent(tag, nextRawProps);
  updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag);
}

function updateDOMProperties(domElement, updatePayload, wasCustomComponentTag, isCustomComponentTag) {
  for(let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i];
    const propValue = updatePayload[i + 1];
    if(propKey === STYLE) {
      setValueForStyles(domElement, propValue);
    } else if(propKey === DANGEROUSLY_SET_INNER_HTML) {

    } else if(propKey === CHILDREN) {
      setTextContent(domElement, propValue);
    } else {
      setValueForProperty(domElement, propKey, propValue, isCustomComponentTag);
    }
  }
}

function getOwnerDocumentFromRootContainer(rootContainerElement) {
  return rootContainerElement.nodeType === DOCUMENT_NODE 
  ? rootContainerElement
  : rootContainerElement.ownerDocument;

}

export function createTextNode(text, rootContainerElement) {
  return getOwnerDocumentFromRootContainer(rootContainerElement).createTextNode(text);
}

export function createElement(type, props, rootContainerElement, parentNamespace) {
  let isCustomComponentTag;
  const ownerDocument = getOwnerDocumentFromRootContainer(rootContainerElement);
  let domElement;
  let namespaceURI = parentNamespace;
  if(namespaceURI === HTML_NAMESPACE) {
    namespaceURI = getIntrinsicNamespace(type);
  }
  if(namespaceURI === HTML_NAMESPACE) { 
    if(typeof props.is === 'string') {
      domElement = ownerDocument.createElement(type, {is: props.is});
    } else {
      domElement = ownerDocument.createElement(type);
    }
  } else {
    domElement = ownerDocument.createElementNS(namespaceURI, type);
  }

  return domElement;
}

export  function  setInitialProperties(domElement, tag, rawProps, rootContainerElement) {
  const isCustomComponentTag = isCustomComponent(tag, rawProps);
  let props;
  switch(tag) {
    // TODO 特定类型的标签
    default:
      props = rawProps;
  }

  // assertValidProps(tag, props);

  setInitialDOMProperties(tag, domElement, rootContainerElement, props, isCustomComponentTag);

  switch(tag) {
    // TODO
  }
}

export function diffProperties(domElement, tag, lastRawProps, nextRawProps, rootContainerElement) {
  let updatePayload = null;
  let lastProps;
  let nextProps;
  switch(tag)  {
    default:
      lastProps = lastRawProps;
      nextProps = nextRawProps;
      break;
  }

  // assertValidProps(tag, nextProps);

  let propKey;
  let styleName;
  let styleUpdates = null;
  for(propKey in lastProps) {
    if(
      nextProps.hasOwnProperty(propKey)
      || !lastProps.hasOwnProperty(propKey)
      || lastProps[propKey] == null
    ) {
      continue
    }

    if(propKey === STYLE) {
      const lastStyle = lastProps[propKey];
      for(styleName in lastStyle) {
        if(lastStyle.hasOwnProperty(styleName)) {
          if(!styleUpdates) {
            styleUpdates =  {};
          }
          styleUpdates[styleName] = '';
        }
      }
    }  else if(propKey === DANGEROUSLY_SET_INNER_HTML || propKey === CHILDREN)  {

    } else {
      (updatePayload = updatePayload  || []).push(propKey, null);
    }
  }

  for(propKey in nextProps)  {
    const nextProp = nextProps[propKey];
    const lastProp = lastProps !== null ? lastProps[propKey] : undefined;

    if(
      !nextProps.hasOwnProperty(propKey)
      || nextProp === lastProp
      || (nextProp === null && lastProp === null)
    ) {
      continue;
    }

    if(propKey === STYLE) {
      if(lastProp) {
        for(styleName in lastProp) {
          if(
            lastProp.hasOwnProperty(styleName)
            && (!nextProp || !nextProp.hasOwnProperty(styleName))
          ) {
            if (!styleUpdates) {
              styleUpdates = {};
            }
            styleUpdates[styleName] = '';
          }
        }

        for(styleName in nextProp) {
          if(
            nextProp.hasOwnProperty(styleName)
            && lastProp[styleName] !== nextProp[styleName]
          ) {
            if(!styleUpdates) {
              styleUpdates = {};
            }

            styleUpdates[propKey] = nextProp[styleName];
          }
        }
      } else {
        if(!styleUpdates) {
          if(!updatePayload)  {
            updatePayload = [];
          }
          updatePayload.push(propKey, styleUpdates);
        }
        styleUpdates = nextProp;

      }
    } else if(propKey  ===  CHILDREN) {
      if(typeof nextProp === 'string' || typeof  nextProp  ===  'number') {
        (updatePayload = updatePayload || []).push(propKey, '' + nextProp);
      }
    } else  {
      (updatePayload = updatePayload || []).push(propKey, nextProp);
    }
  }

  if(styleUpdates) {
    (updatePayload = updatePayload || []).push(STYLE,  styleUpdates);
  }

  return updatePayload;
}

function setInitialDOMProperties(tag, domElement,  rootContainerElement, nextProps, isCustomComponentTag) {
  for(const propKey in  nextProps) {
    if(!nextProps.hasOwnProperty(propKey)) {
      continue;
    }

    const nextProp = nextProps[propKey];
    if(propKey === STYLE)  {

    } else if(propKey ===  DANGEROUSLY_SET_INNER_HTML) {

    } else if(propKey === CHILDREN) {
      if(typeof nextProp === 'string') {
        const canSetTextContent = tag !== 'textarea' || nextProp !== '';
        if(canSetTextContent) {
          setTextContent(domElement, nextProp);
        }
      } else if(typeof nextProp ===  'number') {

      }
      //  TODO 其他情况
    } else  {

    }
  }
}