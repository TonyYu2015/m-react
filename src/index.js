import { createElement, useState, useEffect } from './lib/react/REACT';
import { render } from './lib/react/DOM';

window.__DEV__= true;
window.__PROFILE__= false;
window.__EXPERIMENTAL__= true;

// 添加状态与更新
function UpdateDom(props) {
  const [text, setText] = useState('1');

  useEffect(() => {
    console.log("=====>>>>>useEffect");
    setTimeout(function() {
      console.log("====>>>>>start update");
      setText(222);
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

// 首次渲染
function FirstMount(props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // some effect
    console.log("===>>>>effect: ", count);
    setTimeout(function() {
      console.log("====>>>>>start setTimeout update");
      setCount(2);
    }, 2000);
    return () => {
      console.log("====>>>>>destory");
    }
  }, [count]);
  
  return (
    createElement('div', {
      style: {
        border: "1px solid #000"
      }
    }, `${count}`)
    // createElement(
    //   'ul',
    //   null,
    //   [
    //     createElement(
    //       'li',
    //       null,
    //       '0'
    //     ),
    //     createElement(
    //       'li',
    //       null,
    //       '1'
    //     ),
    //     createElement(
    //       'li',
    //       null,
    //       '2'
    //     ),
    //   ]
    // )
  )
}

render(createElement(FirstMount), document.getElementById('root'));

