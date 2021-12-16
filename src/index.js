import { createElement } from './lib/react/REACT';
import { render } from './lib/react/DOM';

window.__DEV__= true;
window.__PROFILE__= false;
window.__EXPERIMENTAL__= true;

function Test(props) {
  return (
    createElement(
      'span',
      null,
      '1'
    )
  )
}

render(createElement(Test), document.getElementById('root'));

