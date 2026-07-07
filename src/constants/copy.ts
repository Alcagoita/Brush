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

};

const ptPT: typeof en = {

  taskRow: {
    brushAway: (title: string) => `Risca ${title}`,
    unbrush:   (title: string) => `Desrisca ${title}`,
  },

  progress: {
    ringA11y: (done: number, total: number) => `${done} de ${total} tarefas riscadas`,
  },

  emptyState: {
    todayNoTasks:    'Nada para riscar hoje',
    todayAllBrushed: 'Tela limpa. 🖌',
    calendarNoTasks: 'Nada para riscar',
    inboxNoShared:   'Ainda ninguém te enviou nada',
  },

  notification: {
    // A "an"/"a" agreement in English maps to gendered "um"/"uma" in
    // Portuguese, which we can't resolve correctly without a gender lookup
    // per POI label — so the article is dropped here rather than risk
    // guessing the wrong gender.
    proximityTitle: (poiLabel: string) => `Estás perto de: ${poiLabel}`,
    proximityBody: (count: number) =>
      `Tens ${count} coisa${count === 1 ? '' : 's'} para riscar.`,

    dailyCompleteTitle: 'Riscaste tudo hoje 🖌',
    dailyCompleteBody:  'Todas as tarefas riscadas. Tela limpa!',
  },

  achievement: {
    challengeWinnerTitle:    'O primeiro a riscar tudo',
    challengeWonBody:        'Conquista desbloqueada: O primeiro a riscar tudo',
    challengeEndedBody:      'Mais sorte para a próxima!',
    challengeWonNotifTitle:  '🏆 Ganhaste o desafio!',
    dailyCompleteTitle:      'Tudo riscado por hoje!',
    dailyCompleteBody:       'Riscaste todas as tarefas da tua lista. Bom trabalho!',
  },

  challenge: {
    goalTypeLabel: (count: number) => `O primeiro a riscar ${count} tarefas`,
    inviteTitle:   (handle: string, typeLabel: string) =>
      `${handle} desafiou-te: [${typeLabel}] 🏆 — Aceitar?`,
  },

  share: {
    screenTitle:          'Envia um To-do a um amigo',
    sendButton:           (name: string) => `Envia isto para ${name}`,
    activityFeedReceived: (senderName: string) => `${senderName} enviou-te um to-do`,
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
