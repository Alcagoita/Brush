/**
 * copy.ts — KAN-110, bilingual since KAN-252
 *
 * Single source of truth for all brand micro-copy, in English and
 * Português-Portugal (pt-PT — explicitly not pt-BR).
 *
 * Usage (unchanged from before KAN-252 — every existing call site keeps
 * working as-is):
 *   import { COPY } from '../constants/copy';
 *   accessibilityLabel={COPY.taskRow.brushAway(task.title)}
 *
 * `COPY` is a Proxy over whichever language dictionary is currently active
 * (see `setCopyLanguage` below, called from ThemeContext whenever the
 * resolved user language changes) — property reads are forwarded live, so
 * dozens of existing `import { COPY }` call sites across the app never
 * needed to switch to a hook just to become language-aware. Since nearly
 * every screen already calls `useTheme()` for its palette (CLAUDE.md rule 1),
 * a language change already re-renders almost the entire app the same way a
 * dark-mode toggle does.
 */

export type SupportedLanguage = 'en' | 'pt-PT';

const en = {

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
    /** KAN-249 — shown on a POI tile that's the app's inferred guess, not yet confirmed. */
    poiSuggestionHint:    'my guess?',
  },

  // ─── Offline expectations messaging (KAN-236) ──────────────────────────────
  // Never say "POI"/"cache" here — frame everything as the app's own
  // limitation, not the user's problem. State-based, not launch-based: only
  // shown when it's actually true this session, never a blanket warning.
  offline: {
    /** NetworkBanner text when offline AND the habitat cache has never been seeded (fresh install/new phone) — the only fully broken case (KAN-241: every other offline case is now a quiet ContextChip glyph instead of a banner). */
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
    /** KAN-243 — the future-day CTA in Calendar's detail card; dateLabel is the full formatted date (e.g. "Friday, July 24"). */
    entryRowA11yWithDate: (dateLabel: string) => `Plan a trip starting ${dateLabel}`,
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
    /** KAN-250 — Calendar's day CTA when the selected future day already falls within a downloaded trip; replaces entryRowLabel for that day. */
    placesIKnowRowLabel: (destination: string) => `Places I know: ${destination}`,
    placesIKnowRowA11y:  (destination: string) => `Places I know — ${destination}`,
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

  // ─── Context chip (KAN-241 / KAN-242) ──────────────────────────────────────
  // Never say "mode"/"cache"/"snapshot" here — same first-person voice as
  // offline/tripPlanner above. The offline glyph's sheet copy stays
  // area-name-agnostic (no reverse geocoding available); the mall/trip sheets
  // can name the place since it's a destination the user chose themselves.
  contextChip: {
    offlineGlyphA11y: 'Offline — I know this area',
    closeSheetA11y: 'Close sheet',
    closeA11y:      'Close',
    sheetTitle: 'What I know here',
    /** date is the last-learned day (e.g. "Jun 28"), or undefined if the cache has no timestamp yet. */
    sheetBody: (date?: string) =>
      date
        ? `I've learned the places around here — last updated ${date}.`
        : "I've learned the places around here.",
    refreshButton:    'Refresh now',
    refreshingLabel:  'Refreshing…',
    refreshErrorToast: "Couldn't refresh — check your connection and try again.",

    // KAN-242 — mall/trip place contexts.
    mallChipA11y: (name: string) => `In ${name} — tap for details`,
    tripChipA11y: (destination: string) => `In ${destination} — tap for details`,
    offlineDotA11y: 'Offline',
    mallSheetTitle: (name: string) => `While you're at ${name}`,
    tripSheetTitle: (destination: string) => `While you're in ${destination}`,
    placeSheetCoverageLine: "I've learned the places around here.",
    mallSheetFreshnessLine: (date: string) => `Last learned ${date}`,
    placeRefreshErrorToast: "Couldn't refresh — check your connection and try again.",
  },

  // ─── Mall snapshot (KAN-237) ───────────────────────────────────────────────
  mallSnapshot: {
    rowLabel: 'Learn this mall',
    rowSublabel: "Download this mall's places so I work here without signal.",
    downloadingLabel: 'Downloading Shopping mall data…',
    noMallFoundToast: "I can't find a mall nearby — try this again once you're inside one.",
    errorToast: "Couldn't learn this mall — check your connection and try again.",
  },

  // ─── Errand bundling (KAN-235) ──────────────────────────────────────────────
  // "Can happen near each other" reveals opportunity — never "you should",
  // never an itinerary ("first X, then Y"), never a task count framed as
  // pressure ("3 waiting near the market" is wrong; this is right).
  errandBundle: {
    cardLine: (taskCount: number, anchorName: string) =>
      `${taskCount} of these can happen near each other — a ten-minute walk around ${anchorName}.`,
    cardA11y: (taskCount: number, anchorName: string) =>
      `${taskCount} tasks can happen near each other, around ${anchorName} — tap for details`,
    dismissA11y: 'Not now',
    sheetTitle: (anchorName: string) => `Near ${anchorName}`,
    sheetIntro: 'These can happen close together — see what fits, in whatever order suits you.',
    closeA11y: 'Close',
    closeSheetA11y: 'Close sheet',
    openAnchorInMaps: (anchorName: string) => `Open ${anchorName} in Maps`,
  },

  // ─── Home address (KAN-247) ────────────────────────────────────────────────
  // Explicit beats inferred — never "detection"/"fill this" form language.
  home: {
    settingsRowLabel: 'Home',
    settingsRowEmptySublabel: 'Not set',
    screenTitle: 'Home',
    searchPlaceholder: 'Search for your address…',
    note: "So I know my way around your neighborhood. Saved to your account — only you can see it.",
    changeButton: 'Change',
    clearButton: 'Clear',
    clearConfirmTitle: 'Clear home address?',
    clearConfirmBody: "I'll stop using it to know my way around your neighborhood.",
    clearConfirmAction: 'Clear',
    clearCancelAction: 'Keep it',
    saveErrorToast: "Couldn't save — check your connection and try again.",
    clearErrorToast: "Couldn't clear — check your connection and try again.",
  },

  // ─── Settings (KAN-252) ─────────────────────────────────────────────────────
  settings: {
    screenTitle: 'Settings',
    backA11y: 'Back',
    sectionTasks: 'TASKS',
    sectionAppearance: 'APPEARANCE',
    sectionLocationBattery: 'LOCATION & BATTERY',
    sectionImportTasks: 'IMPORT TASKS',
    sectionAccount: 'ACCOUNT',
    manageCategories: 'Manage Categories',
    notificationPreferences: 'Notification Preferences',
    darkMode: 'Dark mode',
    darkModeToggleA11y: 'Dark mode toggle',
    pauseLowBattery: 'Pause nearby alerts on low battery',
    pauseLowBatteryToggleA11y: 'Pause nearby alerts on low battery toggle',
    languageRowLabel: 'Language',
    languageSheetTitle: 'Choose a language',
    languageEnglish: 'English',
    languagePortuguese: 'Português',
    languageCancel: 'Cancel',
    importGoogleTasks: 'Google Tasks',
    importGoogleCalendar: 'Google Calendar',
    importReminders: 'Reminders',
    importCalendar: 'Calendar',
    importInProgressA11y: 'Import in progress',
    importedCount: (count: number) => `${count} imported`,
    importFailedRetry: 'Failed · retry',
    importErrorMessage: 'Import failed. Please try again.',
    signOutConfirmTitle: 'Sign out',
    signOutConfirmBody: "You'll need to sign back in to see your tasks.",
    signOutConfirmAction: 'Sign out',
    signOutCancelAction: 'Cancel',
    signOutErrorTitle: 'Error',
    signOutErrorBody: 'Failed to sign out. Please try again.',
    footerVersion: (version: string) => `Brush Away · v${version}`,
    footerAttribution: 'Place data © OpenStreetMap contributors (ODbL)',
  },

  // ─── Login (KAN-252) ────────────────────────────────────────────────────────
  login: {
    // "Brush away" is the brand verb — kept in English (see taskRow above).
    tagline: 'Brush away your to-dos, as you pass them.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    showPassword: 'Show',
    hidePassword: 'Hide',
    showPasswordA11y: 'Show password',
    hidePasswordA11y: 'Hide password',
    passwordPlaceholderSignup: 'Min. 6 characters',
    passwordPlaceholderSignin: '••••••••',
    orDivider: 'or',
    continueWithGoogle: 'Continue with Google',
    createAccount: 'Create Account',
    signIn: 'Sign In',
    createAccountA11y: 'Create account',
    signInA11y: 'Sign in',
    alreadyHaveAccount: 'Already have an account? ',
    dontHaveAccount: "Don't have an account? ",
    signInLink: 'Sign in',
    signUpLink: 'Sign up',
    errorInvalidEmail: 'Please enter a valid email address.',
    errorUserNotFound: 'No account found with this email.',
    errorInvalidCredential: 'Invalid email or password. Please check your credentials.',
    errorWrongPassword: 'Incorrect password. Please try again.',
    errorEmailInUse: 'An account already exists with this email.',
    errorWeakPassword: 'Password must be at least 6 characters.',
    errorTooManyRequests: 'Too many attempts. Please wait a moment and try again.',
    errorNetwork: 'Network error — check your connection.',
    errorCreateAccountGeneric: 'Could not create account. Please try again.',
    errorSignInGeneric: 'Sign in failed. Please try again.',
    errorEmailRequired: 'Please enter your email address.',
    errorPasswordRequired: 'Please enter your password.',
    errorGoogleSignIn: 'Google sign-in failed. Please try again.',
  },

  // ─── Username setup (KAN-97, KAN-252) ──────────────────────────────────────
  usernameSetup: {
    title: 'Choose a username',
    subtitle: 'Your unique handle for sharing tasks and connecting with friends.',
    placeholder: 'yourhandle',
    inputA11y: 'Username',
    hint: '3–20 chars · letters, numbers, underscores only',
    continueButton: 'Continue',
    note: 'You can change your username once every 30 days.',
    errorTaken: (value: string) => `@${value} is already taken. Please choose another.`,
    errorGeneric: 'Something went wrong. Please try again.',
    errorTooShort: (min: number) => `At least ${min} characters required.`,
    errorTooLong: (max: number) => `Maximum ${max} characters.`,
    errorInvalidChars: 'Only lowercase letters, numbers, and underscores.',
  },

  // ─── Notification preferences (KAN-80, KAN-252) ────────────────────────────
  notificationPreferences: {
    screenTitle: 'Notifications',
    backA11y: 'Back',
    loadingA11y: 'Loading preferences',
    sectionDaily: 'DAILY',
    sectionStreaks: 'STREAKS',
    sectionSummary: 'SUMMARY',
    sectionEngagement: 'ENGAGEMENT',
    sectionLocation: 'LOCATION',
    sectionAchievements: 'ACHIEVEMENTS',
    eodLabel: 'End-of-day check-in',
    eodSublabel: 'Reminds you of any unfinished location tasks.',
    streakLabel: 'Streak at risk',
    streakSublabel: 'Alerts you at 8 PM when your streak is at risk.',
    weeklyLabel: 'Weekly recap',
    weeklySublabel: 'Sunday evening summary of your week.',
    reengageLabel: 'Re-engagement reminders',
    reengageSublabel: 'A nudge after 3 days away from the app.',
    exitPromptLabel: 'Exit prompt',
    exitPromptSublabel: 'Asks if you completed a task after leaving a tagged location.',
    achievementNudgesLabel: 'Achievement nudges',
    achievementNudgesSublabel: "Notifies you when you're 1 step away from unlocking a badge.",
    reminderTimeLabel: 'Reminder time',
    reminderTimeA11y: (time: string) => `Reminder time: ${time}`,
  },

  // ─── Onboarding (KAN-140, KAN-252) ──────────────────────────────────────────
  onboarding: {
    // "BRUSH AWAY" is the app name — kept in English (see taskRow above).
    eyebrow: 'BRUSH AWAY',
    welcomeTagline: 'A calm home for the things your days keep quietly asking for.',
    letsBegin: 'Let’s begin',
    reassurance: 'No setup. No tour. Just your day.',
    addFirstThing: '+ Add your first thing',
    addFirstThingA11y: 'Add your first thing',
    emptyHelper: 'Those are just passing thoughts. Add what’s actually yours.',
    sheetEyebrow: 'The first thing on your mind…',
    sheetHelper: 'Time & place can wait. Just get it out of your head.',
    addTaskA11y: 'Add task',
    addItButton: 'Add it',
    greeting: 'Good morning',
    todayLabel: 'TODAY',
    doneCountDone: '1 / 1 done',
    doneCountPending: '0 / 1',
    defaultTaskTitle: 'Your task',
    hintPrefix: 'Tap the circle to ',
    // "brush it away" is the brand verb — kept in English (see taskRow above).
    hintBold: 'brush it away.',
    rewardHeadline: 'That’s one. Brushed away.',
    rewardCaption: 'Day 1 of your streak starts here. That’s the whole app, really — see it, pass it, let it go.',
    seeFullDay: 'See a full day →',
    nudgeTexts: [
      'Don’t you feel the need for bread?',
      'Maybe today it’s a good day for coffee outside.',
      'This is the week to go to the post office.',
      'What a lovely day to do some sport outside.',
      'That errand you’ve been putting off? Still there.',
      'There’s probably something in the fridge that needs replacing.',
    ],
    chipBuyBread: 'Buy bread',
    chipCoffeeOutside: 'Coffee outside',
    chipGoForRun: 'Go for a run',
    chipWithdrawCash: 'Withdraw cash',
    chipGroceries: 'Groceries',
  },

  // ─── Built-in category labels (KAN-252) — read live by theme/tokens.ts's
  // `categories` object (a getter per key) so every existing
  // `categories.work.label` / `categories[key].label` call site across the
  // app stays language-aware without changing. ──────────────────────────────
  categories: {
    work: 'Work',
    health: 'Health',
    errands: 'Errands',
    personal: 'Personal',
  },

  // ─── Built-in POI catalog labels (KAN-252) — read live via
  // poiCatalogLabel(type) in types/index.ts, same reasoning as categories
  // above. ─────────────────────────────────────────────────────────────────
  poiCatalog: {
    atm: 'ATM',
    cafe: 'Café',
    supermarket: 'Market',
    pharmacy: 'Pharmacy',
    gas: 'Gas',
    gym: 'Gym',
    bank: 'Bank',
    restaurant: 'Restaurant',
    park: 'Park',
    library: 'Library',
    post: 'Post',
    store: 'Store',
    clinic: 'Clinic',
    salon: 'Salon',
    bus: 'Bus',
    school: 'School',
  },

  // ─── Categories screen (KAN-16, KAN-252) ───────────────────────────────────
  categoriesScreen: {
    screenTitle: 'Categories',
    backA11y: 'Back',
    sectionBuiltIn: 'BUILT-IN',
    sectionCustom: 'CUSTOM',
    loadError: 'Could not load categories. Please try again.',
    retry: 'Try again',
    loading: 'Loading…',
    emptyCustom: 'No custom categories yet',
    addCategory: '+ Add Category',
    addCategoryA11y: 'Add category',
    sheetTitleNew: 'New Category',
    sheetTitleEdit: 'Edit Category',
    nameFieldLabel: 'NAME',
    namePlaceholder: 'Category name',
    nameA11y: 'Category name',
    nameRequiredError: 'Please enter a category name.',
    colorFieldLabel: 'COLOUR',
    swatchA11y: (hex: string) => `Color ${hex}`,
    hexPlaceholder: '#rrggbb',
    hexA11y: 'Custom hex colour',
    locationFieldLabel: 'LOCATION TYPE',
    locationNone: 'None',
    locationSearchPlaceholder: 'Search more types…',
    locationSearchA11y: 'Search location type',
    locationSelectedLabel: 'Selected:',
    locationClearA11y: 'Clear location type',
    cancel: 'Cancel',
    save: 'Save',
    saveA11y: 'Save category',
    rowA11y: (name: string) => `${name} category`,
    editButton: 'Edit',
    editA11y: (name: string) => `Edit ${name}`,
    deleteA11y: (name: string) => `Delete ${name}`,
    quickPickAtm: 'ATM',
    quickPickCafe: 'Café',
    quickPickSupermarket: 'Supermarket',
    quickPickPharmacy: 'Pharmacy',
  },

  // ─── Today screen (KAN-45, KAN-252) ─────────────────────────────────────────
  today: {
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    emptyMessages: [
      'Nothing on today. That doesn’t mean nothing matters.',
      'Don’t you feel the need for bread?',
      'Maybe today’s a good day for coffee outside.',
      'Might be worth grabbing some cash while you’re out.',
      'Anything in the cabinet running low?',
      'Something in the fridge is probably asking to be replaced.',
      'A clear day is a gift. What will you do with it?',
      'What’s the one thing future-you will thank you for?',
    ],
    sectionTitlePrefix: 'TODAY · ',
    leftCount: (n: number) => `${n} left`,
    retry: 'Try again',
    addSomething: 'Add something',
    addSomethingHelper: 'Those are just passing thoughts. Add what’s actually yours.',
    openCalendarA11y: (weekday: string, day: number) => `Open calendar for ${weekday} ${day}`,
    nearbyCount: (n: number) => `${n} nearby`,
    addTaskA11y: 'Add task',
    progressLabel: 'PROGRESS',
    progressSummary: (pct: number, remaining: number) => `${pct}% complete · ${remaining} left`,
  },

  // ─── Header (KAN-252) ───────────────────────────────────────────────────────
  header: {
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    goodNight: 'Good night',
    openProfileA11y: 'Open profile',
    pointsA11y: (points: number) => `${points} achievement points · view achievements`,
    pointsSuffix: (points: number) => `${points} pts`,
    socialA11y: (badge: number) => `Social, ${badge} pending`,
    socialA11yNoBadge: 'Social',
    notificationsA11yUnread: 'Notifications, unread',
    notificationsA11y: 'Notifications',
  },

  // ─── Achievements (KAN-114, KAN-252) ────────────────────────────────────────
  achievements: {
    screenTitle: 'Achievements',
    backA11y: 'Back',
    totalPointsLabel: 'TOTAL POINTS',
    totalPointsCaption: 'points earned so far',
    topTierPrefix: 'Top tier · ',
    tinFallback: 'Tin',
    onItsWay: (nextTierName: string) => ` · ${nextTierName} is on its way`,
    earnedSection: (count: number) => `EARNED · ${count}`,
    lockedSection: (count: number) => `LOCKED · ${count}`,
    cardA11y: (label: string, earned: boolean) => `${label} achievement, ${earned ? 'earned' : 'locked'}`,
    ptsEarned: (total: number) => `${total} pts earned`,
    ptsAvailable: (points: number) => `${points} pts available`,
    lockedBadge: 'Locked',
    catalogue: {
      firstTaskLabel: 'Off your mind',
      firstTaskCondition: 'Add your first task',
      firstBrushLabel: 'First brush',
      firstBrushCondition: 'Brush away your first task',
      rightPlaceLabel: 'Right place, right time',
      rightPlaceCondition: 'Brush a task while near where it happens',
      worthWaitLabel: 'Worth the wait',
      worthWaitCondition: 'Brush a task that stuck around for a few days',
      customCatLabel: 'Make it yours',
      customCatCondition: 'Create a custom category',
      outAboutLabel: 'Out and about',
      outAboutCondition: 'Brush tasks at a few different kinds of places',
      challengeWinnerCondition: 'Win a challenge against a friend',
    },
  },

};

const ptPT: typeof en = {

  // "Brush"/"brush away"/"unbrush"/"brushed" — the app's own name and its
  // defining completion-verb wordplay — are kept in English even here, per
  // an explicit product decision: the brand verb never gets localized.
  taskRow: {
    brushAway: (title: string) => `Brush away ${title}`,
    unbrush:   (title: string) => `Unbrush ${title}`,
  },

  progress: {
    ringA11y: (done: number, total: number) => `${done} of ${total} tasks brushed`,
  },

  emptyState: {
    todayNoTasks:    'Nothing to brush away today',
    todayAllBrushed: 'Tela limpa. 🖌',
    calendarNoTasks: 'Nothing to brush away',
    inboxNoShared:   "No one's brushed anything your way yet",
  },

  notification: {
    // A "an"/"a" agreement in English maps to gendered "um"/"uma" in
    // Portuguese, which we can't resolve correctly without a gender lookup
    // per POI label — so the article is dropped here rather than risk
    // guessing the wrong gender.
    proximityTitle: (poiLabel: string) => `Estás perto de: ${poiLabel}`,
    proximityBody: (count: number) =>
      `You have ${count} thing${count === 1 ? '' : 's'} to brush away.`,

    dailyCompleteTitle: "You've brushed it all away today 🖌",
    dailyCompleteBody:  'Every task brushed. Tela limpa!',
  },

  achievement: {
    challengeWinnerTitle:    'First to brush it away',
    challengeWonBody:        'Achievement unlocked: First to brush it away',
    challengeEndedBody:      'Mais sorte para a próxima!',
    challengeWonNotifTitle:  '🏆 Ganhaste o desafio!',
    dailyCompleteTitle:      'All brushed for today!',
    dailyCompleteBody:       "You've brushed every task on your list. Great work!",
  },

  challenge: {
    goalTypeLabel: (count: number) => `First to brush away ${count} tasks`,
    inviteTitle:   (handle: string, typeLabel: string) =>
      `${handle} desafiou-te: [${typeLabel}] 🏆 — Aceitar?`,
  },

  share: {
    screenTitle:          'Brush a To-do with a friend',
    sendButton:           (name: string) => `Brush this over to ${name}`,
    activityFeedReceived: (senderName: string) => `${senderName} brushed a to-do your way`,
  },

  newTaskSheet: {
    title:        'O que precisas de fazer?',
    poiQuestion:  'Onde é que isto acontece?',
    catQuestion:  'Que parte da tua vida?',
    catOptional:  ' (opcional)',
    swipeHint:    'Desliza para ver mais',
    moreDetails:  'Mais detalhes ›',
    cta:          'Adicionar',
    ctaSubmitting: 'A adicionar…',
    titleExamples: [
      'Comprar pasta de dentes…',
      'Levantar dinheiro…',
      'Devolver o livro à biblioteca…',
      'Passar pela farmácia…',
      'Atestar o depósito a caminho de casa…',
    ],
    poiSearchPlaceholder: 'Um café, uma farmácia, um ginásio…',
    timeQuestion:         'Para quando, mais ou menos?',
    timeOptional:         ' (opcional)',
    timePlaceholder:      'Qualquer altura serve',
    footerHint:           'Só o quê e o onde',
    confirmToast:         'Entendido — vou estar atento.',
    poiSuggestionHint:    'o meu palpite?',
  },

  offline: {
    noCacheYetBanner: 'Sem ligação — ainda não consigo procurar sítios por perto. Vou começar a aprender a tua zona assim que estiveres online.',
    uncoveredAreaToast: 'Estás fora da zona que já conheço bem — vou precisar de ligação para encontrar sítios aqui.',
  },

  tripPlanner: {
    entryRowLabel: 'Vais a algum lado?',
    entryRowA11y:  'Planear uma viagem',
    entryRowA11yWithDate: (dateLabel: string) => `Planear uma viagem a partir de ${dateLabel}`,
    destinationQuestion: 'Para onde vais?',
    destinationPlaceholder: 'Faro, Lisboa, Tóquio…',
    datesQuestion: 'Quando vais?',
    datesOptional: ' (opcional)',
    datesSkip:     'Vou saltar as datas',
    radiusTown:          'Só a cidade',
    radiusTownAndAround: 'Cidade e arredores',
    radiusRegion:        'A região toda',
    sizeEstimateLine: (mb: string, untilDate?: string) =>
      untilDate
        ? `Cerca de ${mb} — vou saber até ${untilDate}.`
        : `Cerca de ${mb} — vou manter isto atualizado durante cerca de um mês.`,
    downloadButton:   'Aprender esta zona',
    downloadingLabel: 'A aprender a zona…',
    downloadErrorToast: 'Não consegui aprender esta zona — verifica a tua ligação e tenta outra vez.',
    downloadSuccessToast: (destination: string) => `Entendido — já conheço ${destination}.`,
    placesIKnowTitle: 'Sítios que conheço',
    placesIKnowEmpty: 'Ainda não conheço nenhuma zona de viagem — adiciona uma acima.',
    placesIKnowRowLabel: (destination: string) => `Sítios que conheço: ${destination}`,
    placesIKnowRowA11y:  (destination: string) => `Sítios que conheço — ${destination}`,
    habitatRowLabel: 'Onde costumo andar',
    habitatRowSub:   'Atualizado automaticamente ao longo do teu dia',
    tripRowDates:      (start: string, end: string) => `${start} – ${end}`,
    tripRowNoDates:    'Sem datas definidas',
    tripRowKnownUntil: (date: string) => `Vou saber até ${date}`,
    deleteConfirmTitle:  (destination: string) => `Esquecer ${destination}?`,
    deleteConfirmBody:   'Vou deixar de reconhecer sítios aí. Podes sempre voltar a aprender mais tarde.',
    deleteConfirmAction: 'Esquecer',
    deleteCancelAction:  'Manter',
  },

  contextChip: {
    offlineGlyphA11y: 'Offline — conheço esta zona',
    closeSheetA11y: 'Fechar painel',
    closeA11y:      'Fechar',
    sheetTitle: 'O que conheço aqui',
    sheetBody: (date?: string) =>
      date
        ? `Aprendi os sítios aqui perto — última atualização a ${date}.`
        : 'Aprendi os sítios aqui perto.',
    refreshButton:    'Atualizar agora',
    refreshingLabel:  'A atualizar…',
    refreshErrorToast: 'Não consegui atualizar — verifica a tua ligação e tenta outra vez.',

    mallChipA11y: (name: string) => `Em ${name} — toca para detalhes`,
    tripChipA11y: (destination: string) => `Em ${destination} — toca para detalhes`,
    offlineDotA11y: 'Offline',
    mallSheetTitle: (name: string) => `Enquanto estás em ${name}`,
    tripSheetTitle: (destination: string) => `Enquanto estás em ${destination}`,
    placeSheetCoverageLine: 'Aprendi os sítios aqui perto.',
    mallSheetFreshnessLine: (date: string) => `Última aprendizagem a ${date}`,
    placeRefreshErrorToast: 'Não consegui atualizar — verifica a tua ligação e tenta outra vez.',
  },

  mallSnapshot: {
    rowLabel: 'Aprender este centro comercial',
    rowSublabel: 'Descarrega os sítios deste centro comercial para funcionar aqui sem sinal.',
    downloadingLabel: 'A descarregar dados do centro comercial…',
    noMallFoundToast: 'Não encontro nenhum centro comercial por perto — tenta outra vez quando estiveres dentro de um.',
    errorToast: 'Não consegui aprender este centro comercial — verifica a tua ligação e tenta outra vez.',
  },

  errandBundle: {
    cardLine: (taskCount: number, anchorName: string) =>
      `${taskCount} destas tarefas podem acontecer perto umas das outras — dez minutos a pé à volta de ${anchorName}.`,
    cardA11y: (taskCount: number, anchorName: string) =>
      `${taskCount} tarefas podem acontecer perto umas das outras, à volta de ${anchorName} — toca para detalhes`,
    dismissA11y: 'Agora não',
    sheetTitle: (anchorName: string) => `Perto de ${anchorName}`,
    sheetIntro: 'Estas podem acontecer perto umas das outras — vê o que encaixa, pela ordem que preferires.',
    closeA11y: 'Fechar',
    closeSheetA11y: 'Fechar painel',
    openAnchorInMaps: (anchorName: string) => `Abrir ${anchorName} no Maps`,
  },

  home: {
    settingsRowLabel: 'Casa',
    settingsRowEmptySublabel: 'Não definida',
    screenTitle: 'Casa',
    searchPlaceholder: 'Procura a tua morada…',
    note: 'Para eu saber orientar-me pelo teu bairro. Guardado na tua conta — só tu podes ver.',
    changeButton: 'Alterar',
    clearButton: 'Limpar',
    clearConfirmTitle: 'Limpar morada de casa?',
    clearConfirmBody: 'Vou deixar de a usar para me orientar pelo teu bairro.',
    clearConfirmAction: 'Limpar',
    clearCancelAction: 'Manter',
    saveErrorToast: 'Não consegui guardar — verifica a tua ligação e tenta outra vez.',
    clearErrorToast: 'Não consegui limpar — verifica a tua ligação e tenta outra vez.',
  },

  settings: {
    screenTitle: 'Definições',
    backA11y: 'Voltar',
    sectionTasks: 'TAREFAS',
    sectionAppearance: 'APARÊNCIA',
    sectionLocationBattery: 'LOCALIZAÇÃO E BATERIA',
    sectionImportTasks: 'IMPORTAR TAREFAS',
    sectionAccount: 'CONTA',
    manageCategories: 'Gerir Categorias',
    notificationPreferences: 'Preferências de Notificação',
    darkMode: 'Modo escuro',
    darkModeToggleA11y: 'Alternar modo escuro',
    pauseLowBattery: 'Pausar alertas próximos com bateria fraca',
    pauseLowBatteryToggleA11y: 'Alternar pausa de alertas com bateria fraca',
    languageRowLabel: 'Idioma',
    languageSheetTitle: 'Escolhe um idioma',
    languageEnglish: 'English',
    languagePortuguese: 'Português',
    languageCancel: 'Cancelar',
    importGoogleTasks: 'Google Tasks',
    importGoogleCalendar: 'Google Calendar',
    importReminders: 'Lembretes',
    importCalendar: 'Calendário',
    importInProgressA11y: 'Importação em curso',
    importedCount: (count: number) => `${count} importada${count === 1 ? '' : 's'}`,
    importFailedRetry: 'Falhou · tentar novamente',
    importErrorMessage: 'Falha na importação. Tenta outra vez.',
    signOutConfirmTitle: 'Terminar sessão?',
    signOutConfirmBody: 'Vais precisar de iniciar sessão novamente para ver as tuas tarefas.',
    signOutConfirmAction: 'Terminar sessão',
    signOutCancelAction: 'Cancelar',
    signOutErrorTitle: 'Erro',
    signOutErrorBody: 'Falha ao terminar sessão. Tenta outra vez.',
    footerVersion: (version: string) => `Brush Away · v${version}`,
    footerAttribution: 'Dados de locais © colaboradores do OpenStreetMap (ODbL)',
  },

  login: {
    tagline: 'Brush away your to-dos, as you pass them.',
    emailLabel: 'Email',
    emailPlaceholder: 'tu@exemplo.com',
    passwordLabel: 'Palavra-passe',
    forgotPassword: 'Esqueceste-te da palavra-passe?',
    showPassword: 'Ver',
    hidePassword: 'Ocultar',
    showPasswordA11y: 'Ver palavra-passe',
    hidePasswordA11y: 'Ocultar palavra-passe',
    passwordPlaceholderSignup: 'Mín. 6 caracteres',
    passwordPlaceholderSignin: '••••••••',
    orDivider: 'ou',
    continueWithGoogle: 'Continuar com Google',
    createAccount: 'Criar Conta',
    signIn: 'Entrar',
    createAccountA11y: 'Criar conta',
    signInA11y: 'Entrar',
    alreadyHaveAccount: 'Já tens conta? ',
    dontHaveAccount: 'Não tens conta? ',
    signInLink: 'Entrar',
    signUpLink: 'Criar conta',
    errorInvalidEmail: 'Introduz um endereço de email válido.',
    errorUserNotFound: 'Não encontrámos nenhuma conta com este email.',
    errorInvalidCredential: 'Email ou palavra-passe inválidos. Verifica as tuas credenciais.',
    errorWrongPassword: 'Palavra-passe incorreta. Tenta outra vez.',
    errorEmailInUse: 'Já existe uma conta com este email.',
    errorWeakPassword: 'A palavra-passe deve ter pelo menos 6 caracteres.',
    errorTooManyRequests: 'Demasiadas tentativas. Espera um momento e tenta outra vez.',
    errorNetwork: 'Erro de rede — verifica a tua ligação.',
    errorCreateAccountGeneric: 'Não foi possível criar a conta. Tenta outra vez.',
    errorSignInGeneric: 'Falha ao entrar. Tenta outra vez.',
    errorEmailRequired: 'Introduz o teu endereço de email.',
    errorPasswordRequired: 'Introduz a tua palavra-passe.',
    errorGoogleSignIn: 'Falha ao entrar com Google. Tenta outra vez.',
  },

  usernameSetup: {
    title: 'Escolhe um nome de utilizador',
    subtitle: 'O teu identificador único para partilhar tarefas e ligares-te a amigos.',
    placeholder: 'oteuidentificador',
    inputA11y: 'Nome de utilizador',
    hint: '3–20 carateres · letras, números e underscores apenas',
    continueButton: 'Continuar',
    note: 'Podes alterar o teu nome de utilizador uma vez cada 30 dias.',
    errorTaken: (value: string) => `@${value} já está a ser usado. Escolhe outro.`,
    errorGeneric: 'Algo correu mal. Tenta outra vez.',
    errorTooShort: (min: number) => `São necessários pelo menos ${min} carateres.`,
    errorTooLong: (max: number) => `Máximo de ${max} carateres.`,
    errorInvalidChars: 'Apenas letras minúsculas, números e underscores.',
  },

  notificationPreferences: {
    screenTitle: 'Notificações',
    backA11y: 'Voltar',
    loadingA11y: 'A carregar preferências',
    sectionDaily: 'DIÁRIO',
    sectionStreaks: 'SEQUÊNCIAS',
    sectionSummary: 'RESUMO',
    sectionEngagement: 'ENVOLVIMENTO',
    sectionLocation: 'LOCALIZAÇÃO',
    sectionAchievements: 'CONQUISTAS',
    eodLabel: 'Ponto de situação do dia',
    eodSublabel: 'Recorda-te de tarefas de localização por terminar.',
    streakLabel: 'Sequência em risco',
    streakSublabel: 'Avisa-te às 20h quando a tua sequência estiver em risco.',
    weeklyLabel: 'Resumo semanal',
    weeklySublabel: 'Resumo da tua semana ao domingo à noite.',
    reengageLabel: 'Lembretes de regresso',
    reengageSublabel: 'Um toque depois de 3 dias sem abrir a app.',
    exitPromptLabel: 'Pergunta ao saír',
    exitPromptSublabel: 'Pergunta se concluíste uma tarefa depois de saíres de um local marcado.',
    achievementNudgesLabel: 'Lembretes de conquistas',
    achievementNudgesSublabel: 'Avisa-te quando estiveres a 1 passo de desbloquear um distintivo.',
    reminderTimeLabel: 'Hora do lembrete',
    reminderTimeA11y: (time: string) => `Hora do lembrete: ${time}`,
  },

  onboarding: {
    eyebrow: 'BRUSH AWAY',
    welcomeTagline: 'Um lugar calmo para as coisas que os teus dias andam a pedir em silêncio.',
    letsBegin: 'Vamos começar',
    reassurance: 'Sem configurações. Sem tour. Só o teu dia.',
    addFirstThing: '+ Adiciona a primeira coisa',
    addFirstThingA11y: 'Adiciona a primeira coisa',
    emptyHelper: 'Isso são só pensamentos passageiros. Adiciona o que é realmente teu.',
    sheetEyebrow: 'A primeira coisa em que pensas…',
    sheetHelper: 'A hora e o local podem esperar. Tira isso da cabeça.',
    addTaskA11y: 'Adicionar tarefa',
    addItButton: 'Adicionar',
    greeting: 'Bom dia',
    todayLabel: 'HOJE',
    doneCountDone: '1 / 1 feita',
    doneCountPending: '0 / 1',
    defaultTaskTitle: 'A tua tarefa',
    hintPrefix: 'Toca no círculo para ',
    hintBold: 'brush it away.',
    rewardHeadline: 'Essa foi uma. Brushed away.',
    rewardCaption: 'O dia 1 da tua sequência começa aqui. É basicamente a app toda, no fundo — vês, passas por ela, deixas ir.',
    seeFullDay: 'Ver um dia completo →',
    nudgeTexts: [
      'Não sentes falta de pão?',
      'Talvez hoje seja um bom dia para um café na rua.',
      'É esta a semana para ires aos correios.',
      'Que belo dia para fazeres desporto ao ar livre.',
      'Aquele recado que tens andado a adiar? Continua lá.',
      'Provavelmente há algo no frigorífico que precisa de ser reposto.',
    ],
    chipBuyBread: 'Comprar pão',
    chipCoffeeOutside: 'Café na rua',
    chipGoForRun: 'Ir correr',
    chipWithdrawCash: 'Levantar dinheiro',
    chipGroceries: 'Compras',
  },

  categories: {
    work: 'Trabalho',
    health: 'Saúde',
    errands: 'Recados',
    personal: 'Pessoal',
  },

  poiCatalog: {
    atm: 'Multibanco',
    cafe: 'Café',
    supermarket: 'Mercado',
    pharmacy: 'Farmácia',
    gas: 'Combustível',
    gym: 'Ginásio',
    bank: 'Banco',
    restaurant: 'Restaurante',
    park: 'Parque',
    library: 'Biblioteca',
    post: 'Correios',
    store: 'Loja',
    clinic: 'Clínica',
    salon: 'Salão',
    bus: 'Autocarro',
    school: 'Escola',
  },

  categoriesScreen: {
    screenTitle: 'Categorias',
    backA11y: 'Voltar',
    sectionBuiltIn: 'PRÉ-DEFINIDAS',
    sectionCustom: 'PERSONALIZADAS',
    loadError: 'Não consegui carregar as categorias. Tenta outra vez.',
    retry: 'Tentar outra vez',
    loading: 'A carregar…',
    emptyCustom: 'Ainda não tens categorias personalizadas',
    addCategory: '+ Adicionar Categoria',
    addCategoryA11y: 'Adicionar categoria',
    sheetTitleNew: 'Nova Categoria',
    sheetTitleEdit: 'Editar Categoria',
    nameFieldLabel: 'NOME',
    namePlaceholder: 'Nome da categoria',
    nameA11y: 'Nome da categoria',
    nameRequiredError: 'Introduz um nome para a categoria.',
    colorFieldLabel: 'COR',
    swatchA11y: (hex: string) => `Cor ${hex}`,
    hexPlaceholder: '#rrggbb',
    hexA11y: 'Cor hexadecimal personalizada',
    locationFieldLabel: 'TIPO DE LOCAL',
    locationNone: 'Nenhum',
    locationSearchPlaceholder: 'Procura mais tipos…',
    locationSearchA11y: 'Procurar tipo de local',
    locationSelectedLabel: 'Selecionado:',
    locationClearA11y: 'Limpar tipo de local',
    cancel: 'Cancelar',
    save: 'Guardar',
    saveA11y: 'Guardar categoria',
    rowA11y: (name: string) => `Categoria ${name}`,
    editButton: 'Editar',
    editA11y: (name: string) => `Editar ${name}`,
    deleteA11y: (name: string) => `Eliminar ${name}`,
    quickPickAtm: 'Multibanco',
    quickPickCafe: 'Café',
    quickPickSupermarket: 'Supermercado',
    quickPickPharmacy: 'Farmácia',
  },

  today: {
    weekdays: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    months: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    emptyMessages: [
      'Nada para hoje. Isso não significa que nada importa.',
      'Não sentes falta de pão?',
      'Talvez hoje seja um bom dia para um café na rua.',
      'Pode valer a pena levantar dinheiro enquanto sais.',
      'Falta alguma coisa no armário?',
      'Provavelmente há algo no frigorífico que precisa de ser reposto.',
      'Um dia livre é um presente. O que vais fazer com ele?',
      'Qual é a coisa pela qual o teu eu futuro te vai agradecer?',
    ],
    sectionTitlePrefix: 'HOJE · ',
    leftCount: (n: number) => `faltam ${n}`,
    retry: 'Tentar outra vez',
    addSomething: 'Adiciona algo',
    addSomethingHelper: 'Isso são só pensamentos passageiros. Adiciona o que é realmente teu.',
    openCalendarA11y: (weekday: string, day: number) => `Abrir calendário de ${weekday} ${day}`,
    nearbyCount: (n: number) => `${n} perto`,
    addTaskA11y: 'Adicionar tarefa',
    progressLabel: 'PROGRESSO',
    progressSummary: (pct: number, remaining: number) => `${pct}% concluído · faltam ${remaining}`,
  },

  header: {
    goodMorning: 'Bom dia',
    goodAfternoon: 'Boa tarde',
    goodEvening: 'Boa noite',
    goodNight: 'Boa noite',
    openProfileA11y: 'Abrir perfil',
    pointsA11y: (points: number) => `${points} pontos de conquistas · ver conquistas`,
    pointsSuffix: (points: number) => `${points} pts`,
    socialA11y: (badge: number) => `Social, ${badge} pendentes`,
    socialA11yNoBadge: 'Social',
    notificationsA11yUnread: 'Notificações, por ler',
    notificationsA11y: 'Notificações',
  },

  achievements: {
    screenTitle: 'Conquistas',
    backA11y: 'Voltar',
    totalPointsLabel: 'PONTOS TOTAIS',
    totalPointsCaption: 'pontos ganhos até agora',
    topTierPrefix: 'Nível máximo · ',
    tinFallback: 'Estanho',
    onItsWay: (nextTierName: string) => ` · ${nextTierName} está a chegar`,
    earnedSection: (count: number) => `GANHAS · ${count}`,
    lockedSection: (count: number) => `BLOQUEADAS · ${count}`,
    cardA11y: (label: string, earned: boolean) => `Conquista ${label}, ${earned ? 'ganha' : 'bloqueada'}`,
    ptsEarned: (total: number) => `${total} pts ganhos`,
    ptsAvailable: (points: number) => `${points} pts disponíveis`,
    lockedBadge: 'Bloqueada',
    catalogue: {
      firstTaskLabel: 'Tirado da cabeça',
      firstTaskCondition: 'Adiciona a tua primeira tarefa',
      // "brush"/"Brush away" is the brand verb — kept in English (see taskRow above).
      firstBrushLabel: 'First brush',
      firstBrushCondition: 'Brush away your first task',
      rightPlaceLabel: 'Sítio certo, hora certa',
      rightPlaceCondition: 'Brush a task while near where it happens',
      worthWaitLabel: 'Valeu a pena esperar',
      worthWaitCondition: 'Brush a task that stuck around for a few days',
      customCatLabel: 'Torna-a tua',
      customCatCondition: 'Cria uma categoria personalizada',
      outAboutLabel: 'Por aí fora',
      outAboutCondition: 'Brush tasks at a few different kinds of places',
      challengeWinnerCondition: 'Ganha um desafio contra um amigo',
    },
  },

};

const DICTIONARIES: Record<SupportedLanguage, typeof en> = { en, 'pt-PT': ptPT };

let currentLang: SupportedLanguage = 'en';

/**
 * Switches which language dictionary COPY reads from. Call once whenever the
 * resolved user language changes (see theme/ThemeContext.tsx) — never call
 * this per-render.
 */
export function setCopyLanguage(lang: SupportedLanguage): void {
  currentLang = lang;
}

/** Test-only: read back the active language without a full render cycle. */
export function __getCopyLanguageForTests(): SupportedLanguage {
  return currentLang;
}

export const COPY: typeof en = new Proxy(en, {
  get(_target, prop: string) {
    return (DICTIONARIES[currentLang] as Record<string, unknown>)[prop];
  },
});
