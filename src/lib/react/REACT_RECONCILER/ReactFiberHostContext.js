import { getChildHostContext, getRootHostContext } from "../DOM/ReactDOMHostConfig";
import { disableLegacyContext } from "../shared/ReactFeatureFlags";
import { createCursor, push, pop } from "./ReactFiberStack";

const NO_CONTEXT = {};

const rootInstanceStackCursor = createCursor(NO_CONTEXT);
const contextFiberStackCursor = createCursor(NO_CONTEXT);

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

export function pushHostContainer(fiber, nextRootInstance) {
  push(rootInstanceStackCursor, nextRootInstance, fiber);

  push(contextFiberStackCursor, fiber, fiber);

  push(contextStackCursor, NO_CONTEXT, fiber);

  const nextRootContext = getRootHostContext(nextRootInstance);

  pop(contextStackCursor, fiber);
  push(contextStackCursor, nextRootContext, fiber);
}


export function pushHostContext(fiber) {
  const rootInstance = requiredContext(rootInstanceStackCursor.current);
  const context = requiredContext(contextStackCursor.current);
  const nextContext = getChildHostContext(context, fiber.type, rootInstance);
  if(context === nextContext) {
    return;
  }
  push(contextFiberStackCursor, fiber, fiber);
  push(contextStackCursor, nextContext, fiber);
}