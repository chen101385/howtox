/**
 * Minimal state-machine helper.
 *
 * Booking, session and incident lifecycles are all "explicit status union +
 * allowed transitions". Encoding the allowed edges once means an invalid change
 * (e.g. refunding a booking that was never confirmed) is rejected in one place
 * rather than being guarded ad hoc at each call site.
 */

export type TransitionMap<S extends string> = Readonly<Record<S, readonly S[]>>;

export class InvalidTransitionError<S extends string> extends Error {
  constructor(
    readonly machine: string,
    readonly from: S,
    readonly to: S,
    allowed: readonly S[]
  ) {
    super(
      `Invalid ${machine} transition ${from} → ${to}. ` +
        (allowed.length
          ? `Allowed from ${from}: ${allowed.join(", ")}.`
          : `${from} is a terminal state.`)
    );
    this.name = "InvalidTransitionError";
  }
}

export function createStateMachine<S extends string>(
  machine: string,
  transitions: TransitionMap<S>
) {
  const can = (from: S, to: S): boolean =>
    (transitions[from] ?? []).includes(to);

  const assert = (from: S, to: S): void => {
    if (!can(from, to)) {
      throw new InvalidTransitionError(machine, from, to, transitions[from] ?? []);
    }
  };

  /** Applies the transition, returning the next state. Throws when invalid. */
  const transition = (from: S, to: S): S => {
    assert(from, to);
    return to;
  };

  const isTerminal = (state: S): boolean => (transitions[state] ?? []).length === 0;

  const nextStates = (from: S): readonly S[] => transitions[from] ?? [];

  return { machine, can, assert, transition, isTerminal, nextStates, transitions };
}
