export function getEventPriorityForPluginSystem(domEventName) {
  const priority = eventPriorities.get(domEventName);

  return priority === undefined ? ContinuousEvent : priority;
}