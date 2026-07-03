/**
 * DEBUG KILL-SWITCH — disables every background engine on the Today screen:
 * location permission, outdoor/indoor proximity, store tuning, battery refresh,
 * wear sync, and the post-completion achievements/challenges work. Only the
 * one-shot task fetch stays on so the screen still renders. Flip to false to
 * restore normal behaviour. Used to isolate which "never-stopping" service
 * locks the JS thread.
 */
export const DEBUG_DISABLE_BACKGROUND = false;
