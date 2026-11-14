/**
 * highAccuracy — KAN-515
 *
 * A counter bumped every time the user flips the Profile "High accuracy"
 * switch. Anything that read the preference before a flip (the switch's own
 * first load, the Today screen's start-up restore) compares the counter
 * before applying what it read, so an older read never undoes a newer
 * choice.
 */

let generation = 0;

/** Call when the user changes the switch, before applying the new value. */
export function noteHighAccuracyChange(): void {
  generation += 1;
}

/** The current counter; capture it before a read, compare after. */
export function highAccuracyGeneration(): number {
  return generation;
}
