export default function isCustomComponent(tagName, props) {
  if(tagName.indexOf('-') === -1) {
    return typeof props.is === 'string';
  }
}