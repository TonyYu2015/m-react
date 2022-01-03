import { createElement, useState, useEffect } from './lib/react/REACT';
import { render } from './lib/react/DOM';

window.__DEV__= true;
window.__PROFILE__= false;
window.__EXPERIMENTAL__= true;

function Test(props) {
  const [text, setText] = useState('1');

  useEffect(() => {
    console.log("=====>>>>>useEffect");
    setTimeout(function() {
      console.log("====>>>>>start update");
      setText('2');
    }, 2000);
  }, []);
  console.log("=====>>>>>text", text);

  return (
    createElement(
      'span',
      null,
      text
    )
  )
}

render(createElement(Test), document.getElementById('root'));

