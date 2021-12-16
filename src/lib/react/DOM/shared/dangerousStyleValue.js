export default function dangerousStyleValue(name, value, isCustomProperty) {
  const isEmpty = value == null || typeof value === 'boolean' || value === '';
  if(isEmpty) {
    return '';
  }

  if(!isCustomProperty && typeof value === 'number' && value !==  0) {
    return value + 'px';
  }
  return ('' + value).trim();

}