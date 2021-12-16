import { TEXT_NODE } from "./shared/HTMLNodeType";

export default function setTextContent(node, text) {
  if(text) {
    const firstChild = node.firstChild;
    if(
      firstChild &&
      firstChild === node.lastChild &&
      firstChild.nodeType === TEXT_NODE
    ) {
      firstChild.nodeValue = text;
      return;
    }

    node.textContent = text;
  }
}