export function addEventCaptureListener(
  target,
  eventType,
  listener
) {
  target.addEventListener(eventType, listener, true);
  return listener;
}

export function addEventBubbleListener(
  target,
  eventType,
  listener
) {
  target.addEventListener(eventType, listener, false);
  return listener;
}

export function removeEventListener(
  target,
  eventType,
  listener,
  capture
) {
  target.removeEventListener(eventType, listener, capture);
}