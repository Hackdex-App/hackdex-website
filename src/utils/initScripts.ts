// Inline scripts the root layout runs before first paint, with the storage keys
// they share with their components. They live outside "use client" modules on
// purpose: a server component importing a value from one gets a client
// reference instead of the string, so the script never ran.

export const THEME_STORAGE_KEY = "hackdex-theme";

/** Applies the stored theme, or the system preference when nothing is stored, without a flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

/**
 * The event the fresh-look banner announces. Dismissal is stored per event, so
 * changing this (with the banner's copy) brings it back for the next milestone.
 */
const FRESH_LOOK_EVENT = "1m-downloads";
export const FRESH_LOOK_STORAGE_KEY = `hackdex:fresh-look-dismissed:${FRESH_LOOK_EVENT}`;

/** Marks <html> once the banner was dismissed, so the server-rendered banner never flashes (hack pages are static). */
export const freshLookInitScript = `(function(){try{if(localStorage.getItem("${FRESH_LOOK_STORAGE_KEY}")==="1")document.documentElement.setAttribute("data-fresh-look-dismissed","");}catch(e){}})();`;
