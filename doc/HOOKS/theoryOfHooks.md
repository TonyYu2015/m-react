# The Theory of Hooks

## Concepts in Fiber related to hooks

```javascript
// a hook linked list when render
let WorkInProgressHook: Hook; 

// the hook linked list  in the current structure
let currentHook: Hook; 

// The work-in-progress fiber, it is just named differently to be distinguished from the work-in-progress hook.
let currentlyRenderingFiber: Fiber = (null: any); 

// an update in the hook linked list
type Update<S, A> = {
  lane: Lane,
  action: A,
  eagerReducer: ((S, A) => S) | null,
  eagerState: S | null,
  next: Update<S, A>,
  priority?: ReactPriorityLevel,
};

// the update queue of a hook
type UpdateQueue<S, A> = {
  pending: Update<S, A> | null,
  dispatch: (A => mixed) | null,
  lastRenderedReducer: ((S, A) => S) | null,
  lastRenderedState: S | null,
};

// a hook definition
type Hook = {
    memoizedState: any, // stored state
    baseState: any, // initial state
    baseQueue: Update,
    queue: UpdateQueue,
    next: Hook, // next hook in the  hook linked list
}

// effect hook
type Effect = {
  tag: HookFlags,
  create: () => (() => void) | void,
  destroy: (() => void) | void,
  deps: Array<mixed> | null,
  next: Effect,
};

type Fiber = {
    memoizedState: Hook,  // hook linked list (include all hooks)
    updateQueue: Hook, // effect linked list (only effect hooks), will be used in the commit stage
}
```

## Entry of FunctionCompoent run
>only keep the related code
```javascript
function updateFunctionComponent(
  current,
  workInProgress,
  Component,
  nextProps: any,
  renderLanes,
) {

  let nextChildren;
  nextChildren = renderWithHooks(
    current,
    workInProgress,
    Component,
    nextProps,
    context,
    renderLanes,
  );

  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```

## Main function
`renderWithHooks` is the render function of FunctionComponent, the logic inside the function is very clear. before the 
FunctionComponent run, run the FunctionCompoent, and after the run of the FunctionComponent.

``` javascript
function renderWithHooks(
  current: Fiber | null,
  workInProgress: Fiber,
  Component: (p: Props, arg: SecondArg) => any,
  props: Props,
  secondArg: SecondArg,
  nextRenderLanes: Lanes,
): any {
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  // reset related properties
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = NoLanes;

  // assign different dispatcher function in different stages (mount and update)
  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;

  // run the FunctionComponent
  let children = Component(props, secondArg);

  // We can assume the previous dispatcher is always this one, since we set it
  // at the beginning of the render phase and there's no re-entrancy.
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;

  renderLanes = NoLanes;
  currentlyRenderingFiber = null;

  currentHook = null;
  workInProgressHook = null;

  return children;
}
```

## Inside the FunctionComponent

Before introduce the hooks function, we should know `mountWorkInProgressHook` and `updateWorkInProgressHook`, the two 
functions will be called in mount and update stages respectivly, they will return a new hook or an existed hook.

very simple in the mount function, create a new hook, assign it to workInProgressHook and fiber.memoizedState if not existed,
or assign it to the current workInProgressHook's next, and move the workInProgressHook to the new hook.


### `mountWorkInProgressHook`
```javascript
function mountWorkInProgressHook(): Hook {
  const hook: Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null,
  };

  if (workInProgressHook === null) {
    // This is the first hook in the linked list
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // Append to the end of the linked list
    workInProgressHook = workInProgressHook.next = hook;
  }
  return workInProgressHook;
}
```


### `updateWorkInProgressHook`

the update function will move workInProgressHook and currentHook to next.

```javascript
function updateWorkInProgressHook(): Hook {
  // This function is used both for updates and for re-renders triggered by a
  // render phase update. It assumes there is either a current hook we can
  // clone, or a work-in-progress hook from a previous render pass that we can
  // use as a base. When we reach the end of the base list, we must switch to
  // the dispatcher used for mounts.
  let nextCurrentHook: null | Hook;
  if (currentHook === null) {
    const current = currentlyRenderingFiber.alternate;
    if (current !== null) {
      nextCurrentHook = current.memoizedState;
    } else {
      nextCurrentHook = null;
    }
  } else {
    nextCurrentHook = currentHook.next;
  }

  let nextWorkInProgressHook: null | Hook;
  if (workInProgressHook === null) {
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else {
    nextWorkInProgressHook = workInProgressHook.next;
  }

  if (nextWorkInProgressHook !== null) {
    // There's already a work-in-progress. Reuse it.
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    currentHook = nextCurrentHook;
  } else {
    // Clone from the current hook.

    invariant(
      nextCurrentHook !== null,
      'Rendered more hooks than during the previous render.',
    );
    // move to nextCurrentHook
    currentHook = nextCurrentHook;

    const newHook: Hook = {
      memoizedState: currentHook.memoizedState,

      baseState: currentHook.baseState,
      baseQueue: currentHook.baseQueue,
      queue: currentHook.queue,

      next: null,
    };

    if (workInProgressHook === null) {
      // This is the first hook in the list.
      currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
      // Append to the end of the list.
      workInProgressHook = workInProgressHook.next = newHook;
    }
  }
  return workInProgressHook;
}
```

1. here we can learn why we should not use hooks in a condition statement, because it will rebuild the workInprogressHook linkd
list based on the currentHook linked list, so it may confuse the order if a hook is not the same in the same place. 
2. and don'tupdate the state inside the FunctionComponent as much as possible to avoid reach the limition of render times(25).