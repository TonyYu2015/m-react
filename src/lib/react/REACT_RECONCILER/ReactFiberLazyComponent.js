export function resolvedDefaultProps(Component, baseProps) {
  if(Component && Component.defaultProps) {
    const props = Object.assign({}, baseProps);
    const defaultProps = Component.defaultProps;
    for(const propName in defaultProps) {
      if(props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }

    return props;
  }

  return baseProps;
}