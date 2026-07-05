/**
 * copy.ts — KAN-110
 *
 * Single source of truth for all brand micro-copy.
 * "Brush away" is the app's defining completion verb; every completion-related
 * string lives here so future voice changes are a one-file edit.
 *
 * Usage:
 *   import { COPY } from '../constants/copy';
 *   accessibilityLabel={COPY.taskRow.brushAway(task.title)}
 */

export const COPY = {

  // ─── Task row ─────────────────────────────────────────────────────────────
  taskRow: {
    /** Primary tap action — mark an undone task as done. */
    brushAway:   (title: string) => `Brush away ${title}`,
    /** Reverse action — mark a done task as undone. */
    unbrush:     (title: string) => `Unbrush ${title}`,
  },

  // ─── Progress ring / counters ──────────────────────────────────────────────
  progress: {
    /** Ring accessibility label: "3 of 5 tasks brushed" */
    ringA11y: (done: number, total: number) => `${done} of ${total} tasks brushed`,
  },

  // ─── Empty states ──────────────────────────────────────────────────────────
  emptyState: {
    todayNoTasks:    'Nothing to brush away today',
    todayAllBrushed: 'Clean canvas. 🖌',
    calendarNoTasks: 'Nothing to brush away',
    inboxNoShared:   "No one's brushed anything your way yet",
  },

  // ─── Push / local notifications ───────────────────────────────────────────
  notification: {
    /** Proximity alert — fires when within NEARBY_RADIUS of a POI type with pending tasks. KAN-142. */
    proximityTitle: (poiLabel: string) => {
      const article = /^[aeiou]/i.test(poiLabel) ? 'an' : 'a';
      return `You're near ${article} ${poiLabel}`;
    },
    proximityBody: (count: number) =>
      `You have ${count} thing${count === 1 ? '' : 's'} to brush away.`,

    /** Daily complete celebration. */
    dailyCompleteTitle: "You've brushed it all away today 🖌",
    dailyCompleteBody:  "Every task brushed. Clean canvas!",
  },

  // ─── Achievements ─────────────────────────────────────────────────────────
  achievement: {
    challengeWinnerTitle:    'First to brush it away',
    challengeWonBody:        'Achievement unlocked: First to brush it away',
    challengeEndedBody:      'Better luck next time!',
    challengeWonNotifTitle:  '🏆 You won the challenge!',
    dailyCompleteTitle:      "All brushed for today!",
    dailyCompleteBody:       "You've brushed every task on your list. Great work!",
  },

  // ─── Challenges ───────────────────────────────────────────────────────────
  challenge: {
    goalTypeLabel:   (count: number) => `First to brush away ${count} tasks`,
    inviteTitle:     (handle: string, typeLabel: string) =>
      `${handle} challenged you: [${typeLabel}] 🏆 — Accept?`,
  },

  // ─── Share flow ───────────────────────────────────────────────────────────
  share: {
    screenTitle:          'Brush a To-do with a friend',
    sendButton:           (name: string) => `Brush this over to ${name}`,
    activityFeedReceived: (senderName: string) => `${senderName} brushed a to-do your way`,
  },

  // ─── New task quick sheet (KAN-148) + More Details (KAN-149) ───────────────
  // Shared between both screens — copy must be identical on overlapping
  // fields, since tapping "More details ›" should feel like the same
  // conversation continuing, not a different form.
  newTaskSheet: {
    title:        'What do you need?',
    poiQuestion:  'Where does this happen?',
    catQuestion:  'Which part of your life?',
    catOptional:  ' (optional)',
    swipeHint:    'Swipe for more',
    moreDetails:  'More details ›',
    cta:          'Add it',
    ctaSubmitting: 'Adding…',
    /** Rotating title-input placeholder examples — fade between strings, not a hard swap. */
    titleExamples: [
      'Pick up toothpaste…',
      'Withdraw some cash…',
      'Return the library book…',
      'Grab something at the pharmacy…',
      'Fill up on the way home…',
    ],
    // ── More Details only (KAN-149) ──
    poiSearchPlaceholder: 'A café, a pharmacy, a gym…',
    timeQuestion:         'Around when?',
    timeOptional:         ' (optional)',
    timePlaceholder:      'Anytime is fine',
    footerHint:           'Just the what and the where',
    /** Fires after a successful add from either surface — never on edit. */
    confirmToast:         "Got it — I'll keep an eye out.",
  },

  // ─── Offline expectations messaging (KAN-236) ──────────────────────────────
  // Never say "POI"/"cache" here — frame everything as the app's own
  // limitation, not the user's problem. State-based, not launch-based: only
  // shown when it's actually true this session, never a blanket warning.
  offline: {
    /** NetworkBanner default text — offline, but nothing else worth saying (inside cached coverage, or coverage unknown yet). */
    genericBanner: '⚠️  Offline — changes may not sync',
    /** NetworkBanner text when offline AND the habitat cache has never been seeded (fresh install/new phone) — the only fully broken case. */
    noCacheYetBanner: "No connection — I can't look around for places yet. I'll start learning your area once you're online.",
    /** One-time toast, once per session — offline and the user has moved beyond what the cache knows for their pending errands. */
    uncoveredAreaToast: "You're outside the area I know by heart — I'll need a connection to spot places here.",
  },

  // ─── Trip Planner (KAN-234) ────────────────────────────────────────────────
  // Never say "POI"/"cache"/"download region" here — frame everything in the
  // app's first-person voice, same as offline/newTaskSheet above.
  tripPlanner: {
    entryRowLabel: 'Going somewhere?',
    entryRowA11y:  'Plan a trip',
    destinationQuestion: 'Where are you headed?',
    destinationPlaceholder: 'Faro, Lisbon, Tokyo…',
    datesQuestion: 'When are you going?',
    datesOptional: ' (optional)',
    datesSkip:     "I'll skip the dates",
    radiusTown:          'Just the town',
    radiusTownAndAround: 'Town and around',
    radiusRegion:        'The whole region',
    /** The pre-download "one honest line" — untilDate is set only for a dated trip. */
    sizeEstimateLine: (mb: string, untilDate?: string) =>
      untilDate
        ? `About ${mb} — I'll know it until ${untilDate}.`
        : `About ${mb} — I'll keep it fresh for about a month.`,
    downloadButton:   'Learn this area',
    downloadingLabel: 'Learning the area…',
    downloadErrorToast: "Couldn't learn this area — check your connection and try again.",
    downloadSuccessToast: (destination: string) => `Got it — I know ${destination} now.`,
    placesIKnowTitle: 'Places I know',
    placesIKnowEmpty: "I don't know any trip areas yet — add one above.",
    habitatRowLabel: 'Everywhere I usually go',
    habitatRowSub:   'Updated automatically as you go about your day',
    tripRowDates:      (start: string, end: string) => `${start} – ${end}`,
    tripRowNoDates:    'No dates set',
    tripRowKnownUntil: (date: string) => `I'll know it until ${date}`,
    deleteConfirmTitle:  (destination: string) => `Forget ${destination}?`,
    deleteConfirmBody:   "I'll stop recognizing places there. You can always learn it again later.",
    deleteConfirmAction: 'Forget it',
    deleteCancelAction:  'Keep it',
  },

} as const;
