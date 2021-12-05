import { createCursor } from "./ReactFiberStack";

const NO_CONTEXT = {};

const rootInstanceStackCursor = createCursor(NO_CONTEXT);

const contextStackCursor = createCursor(NO_CONTEXT);

function requiredContext(c) {
  return c;
}

export function getRootHostContainer() {
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  return rootInstance;
}

export function getHostContext() {
  const context = requiredContext(contextStackCursor.current);
  return context;
}

// export function pushHostContext(fiber) {
//   const rootInstance = requiredContext(rootInstanceStackCursor.current);
//   const context = requiredContext(contextStackCursor.current);
//   const nextContext = getChildHostContext(context, fiber.type, rootInstance);
//   if(context === nextContext) {
//     return;
//   }
//   push(contextFiberStackCursor, fiber, fiber);
//   push(contextStackCursor, nextContext, fiber);
// }