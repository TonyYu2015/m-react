import { createElement } from './public/lib/react/REACT';
import { render } from './public/lib/react/DOM';

window.__DEV__= true;
window.__PROFILE__= false;
window.__EXPERIMENTAL__= true;

function Test(props) {
  return (
    createElement(
      'div',
      null,
      createElement('1')
    )
  )
}

render(createElement(Test), document.getElementById('root'));

