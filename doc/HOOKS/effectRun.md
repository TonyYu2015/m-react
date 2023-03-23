# Effect
All effects are queued in the run of FunctionComponent, and handled in the Commit stage. Here we discuss two main effects `useEffect` and `useLayoutEffect`.

## Table Contents
- [Effect](#effect)
  - [Table Contents](#table-contents)
  - [Create Effect](#create-effect)
    - [`mountEffect`](#mounteffect)
    - [`mountLayoutEffect`](#mountlayouteffect)
    - [`mountEffectImpl`](#mounteffectimpl)
    - [`pushEffect`](#pusheffect)
  - [Handle Effects](#handle-effects)
    - [CommitBeforeMutationEffects](#commitbeforemutationeffects)
    - [CommitMutationEffects](#commitmutationeffects)
    - [RecursivelyCommitLayoutEffects](#recursivelycommitlayouteffects)
  - [FlushPassiveEffects(useEffect function)](#flushpassiveeffectsuseeffect-function)
  - [Update Effect](#update-effect)
    - [`updateEffect`](#updateeffect)
    - [`updateLayoutEffect`](#updatelayouteffect)
    - [`updateEffectImpl`](#updateeffectimpl)

---
## Create Effect 
>Here we introduce the two main effects, `useEffect` and `useLayoutEffect` are treated as `mountEffect` and `mountLayoutEffect` respectively in the mount stage.  

### `mountEffect`

  ```
function mountEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
    return mountEffectImpl(
      PassiveEffect | PassiveStaticEffect,
      HookPassive,
      create,
      deps,
    );
}
  ```

### `mountLayoutEffect`
  
```
function mountLayoutEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  return mountEffectImpl(UpdateEffect, HookLayout, create, deps);
}
```

We can see that the two functions both call the `mountEffectImpl` to create their own effect. The difference between them is the parments passed into the function which will used in the commit stage.

### `mountEffectImpl`

```
function mountEffectImpl(fiberFlags, hookFlags, create, deps): void {
  const hook = mountWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  currentlyRenderingFiber.flags |= fiberFlags;
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps,
  );
}
```

Then call the `puchEffect` function to create new effect, mount it to the hooks linked list and fiber's updateQueue.

###  `pushEffect`

```
function pushEffect(tag, create, destroy, deps) {
  const effect: Effect = {
    tag,
    create,
    destroy,
    deps,
    // Circular
    next: (null: any),
  };
  let componentUpdateQueue: null | FunctionComponentUpdateQueue = (currentlyRenderingFiber.updateQueue: any);
  if (componentUpdateQueue === null) {
    componentUpdateQueue = createFunctionComponentUpdateQueue();
    currentlyRenderingFiber.updateQueue = (componentUpdateQueue: any);
    componentUpdateQueue.lastEffect = effect.next = effect;
  } else {
    const lastEffect = componentUpdateQueue.lastEffect;
    if (lastEffect === null) {
      componentUpdateQueue.lastEffect = effect.next = effect;
    } else {
      const firstEffect = lastEffect.next;
      lastEffect.next = effect;
      effect.next = firstEffect;
      componentUpdateQueue.lastEffect = effect;
    }
  }
  return effect;
}
```

## Handle Effects 
> The handle effects action is in the commit stage, and the stage can be seperate into three steps.
> 
> 1. `commitBeforeMutationEffects` 
> 2. `commitMutationEffects`
> 3. `recursivelyCommitLayoutEffects`

### CommitBeforeMutationEffects
> before DOM mutation

```
function commitBeforeMutationEffects(firstChild: Fiber) {
  let fiber = firstChild;
  // DFS
  while (fiber !== null) {
    if (fiber.child !== null) {
      const primarySubtreeFlags = fiber.subtreeFlags & BeforeMutationMask;
      if (primarySubtreeFlags !== NoFlags) {
        commitBeforeMutationEffects(fiber.child);
      }
    }

    commitBeforeMutationEffectsImpl(fiber);
    fiber = fiber.sibling;
  }
}
```

`commitBeforeMutationEffectsImpl`

```
function commitBeforeMutationEffectsImpl(fiber: Fiber) {
  const current = fiber.alternate;
  const flags = fiber.flags;

  if ((flags & Passive) !== NoFlags) {
    // If there are passive effects, schedule a callback to flush at
    // the earliest opportunity.
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      // async task
      scheduleCallback(NormalSchedulerPriority, () => {
        flushPassiveEffects();
        return null;
      });
    }
  }
}
```

Here we can see before the mutation stage, just schedule an async task of `flushPassiveEffects`.

### CommitMutationEffects
> DOM mutation
```
function commitMutationEffects(
  firstChild: Fiber,
  root: FiberRoot,
  renderPriorityLevel: ReactPriorityLevel,
) {
  let fiber = firstChild;
  while (fiber !== null) {
    // DFS
    if (fiber.child !== null) {
      const mutationFlags = fiber.subtreeFlags & MutationMask;
      if (mutationFlags !== NoFlags) {
        commitMutationEffects(fiber.child, root, renderPriorityLevel);
      }
    }

    commitMutationEffectsImpl(fiber, root, renderPriorityLevel);
    fiber = fiber.sibling;
  }
}
```
`commitMutationEffectsImpl`
```
function commitMutationEffectsImpl(
  fiber: Fiber,
  root: FiberRoot,
  renderPriorityLevel,
) {
  const flags = fiber.flags;

  const primaryFlags = flags & (Placement | Update | Hydrating);
  switch (primaryFlags) {
    case PlacementAndUpdate: {
      // Update
      const current = fiber.alternate;
      commitWork(current, fiber);
      break;
    }
    case Update: {
      const current = fiber.alternate;
      commitWork(current, fiber);
      break;
    }
  }
}
```
`commitWork`
```
function commitWork(current: Fiber | null, finishedWork: Fiber): void {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case MemoComponent:
      case SimpleMemoComponent:
      case Block: {
        // Layout effects are destroyed during the mutation phase so that all
        // destroy functions for all fibers are called before any create functions.
        // This prevents sibling component effects from interfering with each other,
        // e.g. a destroy function in one component should never override a ref set
        // by a create function in another component during the same commit.
          commitHookEffectListUnmount(
            HookLayout | HookHasEffect,
            finishedWork,
            finishedWork.return,
          );
        return;
      }
    }
}
```

Before the DOM mutation, the desotry function of useLayoutEffect will be handled, not like the useEffect.

### RecursivelyCommitLayoutEffects
> after DOM mutation
```
function recursivelyCommitLayoutEffects() {
  let child = finishedWork.child;
  // DFS
  while (child !== null) {
    const primarySubtreeFlags = finishedWork.subtreeFlags & LayoutMask;
    if (primarySubtreeFlags !== NoFlags) {
      recursivelyCommitLayoutEffects(child, finishedRoot);
    }
    child = child.sibling;
  }
  // all layout effect will be marked as Update flag.
  const primaryFlags = flags & (Update | Callback);
  if (primaryFlags !== NoFlags) {
    switch (tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent:
      case Block: {
        // run the layout effect after desotry function
        commitHookEffectListMount(
          HookLayout | HookHasEffect,
          finishedWork,
        );

        if ((finishedWork.subtreeFlags & PassiveMask) !== NoFlags) {
          schedulePassiveEffectCallback();
        }
        break;
      }
    }
  }
}
```

`schedulePassiveEffectCallback`: schedule the passive effect async
```
export function schedulePassiveEffectCallback() {
  if (!rootDoesHavePassiveEffects) {
    rootDoesHavePassiveEffects = true;
    scheduleCallback(NormalSchedulerPriority, () => {
      flushPassiveEffects();
      return null;
    });
  }
}
```

Here the function of useLayoutEffect will be called, and schedule another useEffect function.

## FlushPassiveEffects(useEffect function)
```
export function flushPassiveEffects(): boolean {
  // Returns whether passive effects were flushed.
  if (pendingPassiveEffectsRenderPriority !== NoSchedulerPriority) {
    const priorityLevel =
      pendingPassiveEffectsRenderPriority > NormalSchedulerPriority
        ? NormalSchedulerPriority
        : pendingPassiveEffectsRenderPriority;
    pendingPassiveEffectsRenderPriority = NoSchedulerPriority;
    return runWithPriority(priorityLevel, flushPassiveEffectsImpl);
  }
  return false;
}
```
We can see the real logic is in the `flushPassiveEffectsImpl` function.
Only keep the related code.
```
function flushPassiveEffectsImpl() {

  // It's important that ALL pending passive effect destroy functions are called
  // before ANY passive effect create functions are called.
  // Otherwise effects in sibling components might interfere with each other.
  // e.g. a destroy function in one component may unintentionally override a ref
  // value set by a create function in another component.
  // Layout effects have the same constraint.

  flushPassiveUnmountEffects(root.current);
  flushPassiveMountEffects(root, root.current);

  return true;
}
```

`flushPassiveUnmountEffects`
```
function flushPassiveUnmountEffects(firstChild: Fiber): void {
  let fiber = firstChild;
  while (fiber !== null) {

    // DFS
    const child = fiber.child;
    if (child !== null) {
      // If any children have passive effects then traverse the subtree.
      // Note that this requires checking subtreeFlags of the current Fiber,
      // rather than the subtreeFlags/effectsTag of the first child,
      // since that would not cover passive effects in siblings.
      const passiveFlags = fiber.subtreeFlags & PassiveMask;
      if (passiveFlags !== NoFlags) {
        flushPassiveUnmountEffects(child);
      }
    }

    const primaryFlags = fiber.flags & Passive;
    if (primaryFlags !== NoFlags) {
      commitPassiveUnmountOnFiber(fiber);
    }

    fiber = fiber.sibling;
  }
}
```
`commitPassiveUnmountOnFiber` this function actully is `commitPassiveUnmount`
```
function commitPassiveUnmount(finishedWork: Fiber): void {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
    case Block: {
        commitHookEffectListUnmount(
          HookPassive | HookHasEffect,
          finishedWork,
          finishedWork.return,
        );
      break;
    }
  }
}
```

`flushPassiveMountEffects`
```
function flushPassiveMountEffects(root, firstChild: Fiber): void {
  let fiber = firstChild;
  while (fiber !== null) {
    let prevProfilerOnStack = null;

    // DFS
    const primarySubtreeFlags = fiber.subtreeFlags & PassiveMask;
    if (fiber.child !== null && primarySubtreeFlags !== NoFlags) {
      flushPassiveMountEffects(root, fiber.child);
    }

    if ((fiber.flags & Passive) !== NoFlags) {
          commitPassiveMountOnFiber(root, fiber);
    }
    fiber = fiber.sibling;
  }
}
```
`commitPassiveMountOnFiber` this function actully is `commitPassiveMount`
```
function commitPassiveMount(
  finishedRoot: FiberRoot,
  finishedWork: Fiber,
): void {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
    case Block: {
        commitHookEffectListMount(HookPassive | HookHasEffect, finishedWork);
      }
      break;
  }
}
```
---
`commitHookEffectListUnmount`, `useEffect` and `useLayoutEffect` both will call this function in the last to run the destory function.
```
function commitHookEffectListUnmount(
  flags: HookFlags,
  finishedWork: Fiber,
  nearestMountedAncestor: Fiber | null,
) {
  const updateQueue: FunctionComponentUpdateQueue | null = (finishedWork.updateQueue: any);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        // Unmount
        const destroy = effect.destroy;
        effect.destroy = undefined;
        if (destroy !== undefined) {
          safelyCallDestroy(finishedWork, nearestMountedAncestor, destroy);
        }
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

`commitHookEffectListMount`, `useEffect` and `useLayoutEffect` both will call this function in the last to run the create function.
```
function commitHookEffectListMount(flags: HookFlags, finishedWork: Fiber) {
  const updateQueue: FunctionComponentUpdateQueue | null = (finishedWork.updateQueue: any);
  const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
  if (lastEffect !== null) {
    const firstEffect = lastEffect.next;
    let effect = firstEffect;
    do {
      if ((effect.tag & flags) === flags) {
        // Mount
        const create = effect.create;
        effect.destroy = create();
      }
      effect = effect.next;
    } while (effect !== firstEffect);
  }
}
```

## Update Effect

### `updateEffect`
```
function updateEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps);
}
```
### `updateLayoutEffect`
```
function updateLayoutEffect(
  create: () => (() => void) | void,
  deps: Array<mixed> | void | null,
): void {
  return updateEffectImpl(UpdateEffect, HookLayout, create, deps);
}
```
> `useEffect` will run the `updateEffect`, `useLayoutEffect` will run the `updateLayoutEffect` in the update stage. And both directly call the `updateEffectImpl` function.

### `updateEffectImpl`
```
function updateEffectImpl(fiberFlags, hookFlags, create, deps): void {
  // get the hook linked list, 
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;
  let destroy = undefined;

  if (currentHook !== null) {
    const prevEffect = currentHook.memoizedState;
    destroy = prevEffect.destroy;
    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;
      // if the deps are equal, no need to run the effect, just add it to the fiber's updateQueue for the continue run.
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }
  }

  // mark it on the fiber, wait for handle in the commit stage.
  currentlyRenderingFiber.flags |= fiberFlags;

  // same as before, but need to be sotred in the effect hook.
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps,
  );
}
```
The logic of `updateWorkInProgressHook`, you can see here [updateWorkInProgressHook](./theoryOfHooks.md#updateworkinprogresshook), and the `pushEffect` is here [pushEffect](theoryOfHooks.md#pusheffect-will-be-used-both-in-mount-and-update-stages)
