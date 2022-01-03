import { popHostContainer } from "./ReactFiberHostContext";
import { HostComponent, HostRoot } from "./ReactWorkTags";
import {
  popTopLevelContextObject as popTopLevelLegacyContextObject,
} from './ReactFiberContext';

export function unwindInterruptedWork(interruptedWork) {
  switch(interruptedWork.tag) {
    case HostRoot:
      popHostContainer(interruptedWork);
      popTopLevelLegacyContextObject(interruptedWork);
      // resetMutableSourceWorkInProgressVersions();
    case HostComponent:
      popHostContext(interruptedWork);
  }
}