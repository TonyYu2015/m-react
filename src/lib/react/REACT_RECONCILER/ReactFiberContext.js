import { disableLegacyContext } from "../shared/ReactFeatureFlags";
import { createCursor, push, pop } from "./ReactFiberStack";


export const emptyContextObject = {};

const contextStackCursor = createCursor(emptyContextObject);
const didPerformWorkStackCursor = createCursor(false);

export function pushTopLevelContextObject(fiber, context, didChange) {
  if(disableLegacyContext) {
    return;
  } else {
    push(contextStackCursor, context, fiber);
    push(didPerformWorkStackCursor, didChange, fiber);
  }
}

export function popTopLevelContextObject(fiber) {
  if (disableLegacyContext) {
    return;
  } else {
    pop(didPerformWorkStackCursor, fiber);
    pop(contextStackCursor, fiber);
  }
}