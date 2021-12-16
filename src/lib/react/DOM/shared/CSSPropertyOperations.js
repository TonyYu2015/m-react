import dangerousStyleValue from "./dangerousStyleValue";

export function setValueForStyles(node, styles) {
  const style = node.style;
  for(let styleName in styles) {
    if(!styles.hasOwnProperty(styleName)) {
      continue;
    }
    const isCustomProperty = styleName.indexOf('--') === 0;
    const styleValue = dangerousStyleValue(
      styleName,
      styles[styleName],
      isCustomProperty
    );

    if(styleName === 'float') {
      styleName = 'cssFloat';
    }
    if(isCustomProperty) {
      style.setProperty(styleName, styleValue);
    } else {
      style[styleName] = styleValue;
    }
  }
}