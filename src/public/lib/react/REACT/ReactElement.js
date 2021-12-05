import { REACT_ELEMENT_TYPE } from "../shared/ReactSymbols";
import ReactCurrentOwner from "./ReactCurrentOwner";

function ReactElement(type, key, ref, self, source, owner, props) {
  const element = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    ref,
    self,
    props,
    _owner: owner,
  }

  return element;
}

export function createElement(type, config, children) {
  let propName;

  const props = {};

  let key = null;
  let ref = null;
  let self = null;
  let source = null;

  if(config !== null) {

  }

  const childrenLength = arguments.length - 2;
  if(childrenLength === 1) {
    props.children = children;
  } else if(childrenLength > 1){
    const childArray = Array(childrenLength);
    for(let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    } 
    props.children = childArray;
  }

  if(type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for(propName in defaultProps) {
      if(props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props
  )
}