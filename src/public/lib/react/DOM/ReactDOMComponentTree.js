const randomKey = Math.random().toString(36).slice(2);
const internalPropsKey = '__reactProps$' + randomKey;
const internalContainerInstanceKey = '__reactContainer$' + randomKey;


export function updateFiberProps(node, props) {
  node[internalPropsKey] = props;
}

export function markContainerAsRoot(hostRoot, node) {
  node[internalContainerInstanceKey] = hostRoot;
}