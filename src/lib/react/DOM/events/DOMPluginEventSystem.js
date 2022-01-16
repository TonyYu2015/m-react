import { enableEagerRootListeners, enableLegacyFBSupport } from "../../shared/ReactFeatureFlags";

export function listenToAllSupportedEvents(rootContainerElement) {
  if(enableEagerRootListeners){
    // 全局只注册一次
    if(rootContainerElement[listeningMarker]) {
      return;
    }

    rootContainerElement[listeningMarker] = true;
    allNativeEvents.forEach(domEventName => {
      if(!NonDelegatedEvents.has(domEventName)) {
        listenToNativeEvent(
          domEventName,
          false,
          rootContainerElement,
          null,
        );
      }

      listenToNativeEvent(
        domEventName,
        true,
        rootContainerElement,
        null,
      );
    });
  }
}

export function listenToNativeEvent(
  domEventName,
  isCapturePhaseListener,
  rootContainerElement,
  targetElement,
  eventSystemFlags = 0
) {
  let target = rootContainerElement;
  const listenerSet = getEventListenerSet(target);
  const listenerSetKey = getListenerSetKey(domEventName, isCapturePhaseListener);
  if(!listenerSet.has(listenerSetKey)) {
    if(isCapturePhaseListener) {
      eventSystemFlags |= IS_CAPTURE_PHASE;
    }

    addTrappedEventListener(
      target,
      domEventName,
      eventSystemFlags,
      isCapturePhaseListener,
    );

    listenerSet.add(listenerSetKey);
  }
}

function addTrappedEventListener(
  targetContainer,
  domEventName,
  eventSystemFlags,
  isCapturePhaseListener,
  isDeferredListenerForLegacyFBSupport
) {
  const listener = createEventListenerWrapperWithPriority(
    targetContainer,
    domEventName,
    eventSystemFlags,
  );

  let isPassiveListener = undefined;

  targetContainer = 
    enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport 
      ? targetContainer.ownerDocument
      : targetContainer;
  
  let unsubscriberListener;

  if(enableLegacyFBSupport && isDeferredListenerForLegacyFBSupport) {
    const originalListener = listener;
    listener = function(...p) {
      removeEventListener(
        targetContainer,
        domEventName,
        unsubscriberListener,
        isCapturePhaseListener,
      );

      originalListener.apply(this, p);
    }
  }

  if(isCapturePhaseListener) {
    if(isPassiveListener !== undefined) {

    } else {
      unsubscribeListener = addEventCaptureListener(
        targetContainer,
        domEventName,
        listener
      );
    }
  } else {
    if(isPassiveListener !== undefined) {

    } else {
      unsubscriberListener = addEventBubbleListener(
        targetContainer,
        domEventName,
        listener
      );
    }
  }

    
}