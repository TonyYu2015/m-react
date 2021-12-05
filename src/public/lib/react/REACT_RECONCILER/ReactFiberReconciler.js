import { createFiberRoot } from './ReactFiberRoot';
import {
  requestEventTime, requestUpdateLane, scheduleUpdateOnFiber
} from './ReactFiberWorkLoop'
import { createUpdate, enqueueUpdate } from './ReactUpdateQueue';

function updateContainer(
  element, 
  container, 
  parentComponent
  ) {
    const current = container.current;
    const eventTime = requestEventTime();
    const lane = requestUpdateLane(current);
    const update = createUpdate(eventTime, lane);

    update.payload = {element};

    enqueueUpdate(current, update);
    scheduleUpdateOnFiber(current, lane, eventTime);
    return lane;
}

export function createContainer(containerInfo, tag) {
  return createFiberRoot(containerInfo, tag) ;
}

export {
  updateContainer
}