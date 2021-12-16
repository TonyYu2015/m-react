import { disableLegacyContext } from "../shared/ReactFeatureFlags";
import { createCursor, push } from "./ReactFiberStack";

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