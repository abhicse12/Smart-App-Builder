// Design system for UI changes requested through Modify ("make the UI
// better", "improve the design", ...). Generation keeps its shorter
// styling rules to limit the load on the model; a UI request then
// restyles only the presentational frontend files.

const UI_REQUEST_PATTERN =
  /\b(ui|ux|design|redesign|style|styles|styling|css|tailwind|look|looks|looking|beautiful|attractive|appealing|pretty|modern|polish|layout|theme|colou?rs?|font|fonts|spacing|responsive|decent|ugly|nicer|better looking|visual|appearance)\b/i;

// "improve the login and navbar": an improvement verb + a UI element
const IMPROVE_PATTERN =
  /\b(improve|improved|enhance|upgrade|beautify|revamp|refresh|restyle|polish|prettier|nicer|cleaner|better)\b/i;

const UI_ELEMENT_PATTERN =
  /\b(navbar|nav ?bar|navigation|menu|header|footer|sidebar|hero|banner|login|log in|signin|sign in|signup|sign up|register|page|pages|screen|card|cards|button|buttons|form|forms|dashboard|home|landing)\b/i;

// Improvements that are about behaviour, not appearance
const NON_UI_PATTERN =
  /\b(security|secure|performance|speed|validation|validate|logic|api|endpoint|database|backend|bug|bugs|error|errors|fix|broken|crash|token|password reset|feature)\b/i;

export const isUiRequest = (userRequest = "") => {
  const request = String(userRequest);

  if (UI_REQUEST_PATTERN.test(request)) {
    return true;
  }

  return (
    IMPROVE_PATTERN.test(request) &&
    UI_ELEMENT_PATTERN.test(request) &&
    !NON_UI_PATTERN.test(request)
  );
};

export const UI_DESIGN_RULES = `
==================================================
UI DESIGN SYSTEM (MANDATORY FOR THIS REQUEST)
==================================================

Restyle the app into a clean, modern, consistent product UI using
Tailwind CSS v4 utility classes only.

1. Palette and surfaces
   - Page background: bg-slate-50. Text: text-slate-900 headings,
     text-slate-600 body, text-slate-500 muted.
   - One accent color (indigo-600, hover indigo-700) for primary
     actions and links; emerald for success, rose for danger,
     amber for warnings. Use the same palette on every page.
   - Cards / panels: rounded-2xl border border-slate-200 bg-white
     shadow-sm, hover:shadow-md transition where clickable.

2. Layout
   - Content container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8.
   - Vertical rhythm: sections py-8 md:py-12, gaps gap-4 / gap-6.
   - Mobile-first and responsive (sm:, md:, lg:). No fixed pixel
     widths; grids collapse to one column on phones.

3. Typography
   - Page title: text-3xl md:text-4xl font-bold tracking-tight.
   - Section title: text-xl font-semibold. Body: text-sm md:text-base.
   - Prices / key numbers: text-lg font-bold text-slate-900.

4. Navbar
   - Shell: <header className="sticky top-0 z-50 border-b
     border-slate-200/70 bg-white/80 backdrop-blur-lg">, inner
     container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex
     items-center justify-between gap-4. Same height on every page.
   - Brand (left, links to "/"): a logo mark (size-9 rounded-xl
     bg-gradient-to-br from-indigo-600 to-violet-600 text-white,
     centered inline SVG icon or the first letter, shadow-md
     shadow-indigo-500/30) followed by the app name in
     text-lg font-extrabold tracking-tight text-slate-900.
   - Links (center, hidden md:flex gap-1): use NavLink from
     react-router-dom so the current page is marked. Inactive:
     rounded-lg px-3 py-2 text-sm font-medium text-slate-600
     hover:bg-slate-100 hover:text-slate-900. Active: bg-indigo-50
     text-indigo-700. Keep the existing link targets.
   - Right side, logged out: "Log in" as a ghost button (rounded-xl
     px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100)
     and "Sign up" as the primary button.
   - Right side, logged in: an avatar circle (size-9 rounded-full
     bg-gradient-to-br from-indigo-500 to-violet-500 text-sm
     font-semibold text-white) with the user's initials, the name
     (hidden sm:block text-sm font-medium text-slate-700) and Logout
     as a small secondary button (rounded-xl border border-slate-200
     px-3 py-1.5 text-sm hover:bg-slate-50, text-rose-600 allowed).
     Use the existing user object and logout handler.
   - If the app has a cart, show a cart icon button (relative size-10
     rounded-xl hover:bg-slate-100) with a count badge (absolute
     -top-1 -right-1 min-w-5 h-5 rounded-full bg-indigo-600 px-1
     text-[11px] font-bold text-white grid place-items-center) using
     the existing cart data; no badge when the count is 0.
   - Mobile (below md): links and auth buttons move into a menu opened
     by a hamburger button (md:hidden, inline SVG, aria-label,
     aria-expanded). The open panel sits under the bar (border-t
     bg-white px-4 py-3 space-y-1) with full-width links, and closes
     when a link is clicked.

   - Never show raw text like "abhii Logout" side by side without
     spacing or button styling.

5. Home / landing pages
   - Start with a hero: rounded-3xl gradient background
     (from-indigo-600 to-violet-600, white text) or a soft gradient,
     a bold headline, one sentence of supporting text and 1-2 CTAs.

6. Buttons and forms
   - Primary button: inline-flex items-center justify-center gap-2
     rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold
     text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]
     disabled:opacity-50 disabled:cursor-not-allowed transition.
   - Secondary: same shape, border border-slate-300 bg-white
     text-slate-700 hover:bg-slate-50. Danger: bg-rose-600.
   - Inputs: w-full rounded-xl border border-slate-300 bg-white px-4
     py-2.5 text-sm placeholder:text-slate-400 outline-none
     focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100.
     Every input has a <label> (text-sm font-medium text-slate-700).
   - Show API errors in an alert: rounded-xl border border-rose-200
     bg-rose-50 px-4 py-3 text-sm text-rose-700.

7. Auth pages (login / signup)
   - Page: min-h-[calc(100vh-4rem)] grid lg:grid-cols-2 gap-8 items-center
     max-w-6xl mx-auto px-4 py-10.
   - Left panel (hidden lg:flex): rounded-3xl bg-gradient-to-br
     from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white
     relative overflow-hidden, with 2 decorative blurred circles
     (absolute rounded-full bg-white/10 blur-2xl), a headline
     (text-3xl font-bold), one supporting sentence (text-white/80) and
     3 benefit rows (check icon in a size-6 rounded-full bg-white/20
     badge + short text). Content is about the app's real purpose.
   - Form card (right, or centered alone on small screens): w-full
     max-w-md mx-auto rounded-3xl border border-slate-200 bg-white p-8
     sm:p-10 shadow-xl shadow-slate-200/60.
   - Card header: logo mark, title ("Welcome back" / "Create your
     account") text-2xl font-bold tracking-tight, subtitle
     text-sm text-slate-500 mt-1, then the form with space-y-5.
   - Each field: <label> + a relative wrapper with a leading inline
     SVG icon (absolute left-3.5 top-1/2 -translate-y-1/2 size-5
     text-slate-400: mail, lock, user) and the input from rule 6 with
     pl-11. Use type="email", autoComplete="email" /
     "current-password" / "new-password" / "name", and autoFocus on
     the first field.
   - Password fields get a show/hide toggle button (absolute right-3,
     text-slate-400 hover:text-slate-600, aria-label) that switches the
     input type.
   - Errors: if the component already has an error state, render it
     in the alert style from rule 6 above the submit button.
   - Submit: full-width primary button h-11; if a loading state exists,
     show a small spinner (size-4 animate-spin rounded-full border-2
     border-white/40 border-t-white) and disable the button while
     loading.
   - Below the form: "Don't have an account? Sign up" /
     "Already have an account? Log in" in text-sm text-slate-500 with
     the link in font-semibold text-indigo-600 hover:text-indigo-700.
   - Do NOT add "Forgot password?", "Remember me" or social login
     buttons unless that functionality already exists.

8. Lists, cards and catalogs
   - Grid: grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4.
   - Item card: image on top (aspect-[4/3] w-full object-cover,
     group-hover:scale-105 transition inside overflow-hidden), then
     title (font-semibold line-clamp-1), short description
     (line-clamp-2 text-sm text-slate-500), price/badges, and a
     full-width action button.
   - If an item has no image URL, render a gradient placeholder
     (bg-gradient-to-br from-indigo-100 to-violet-100) with the first
     letter of the name, never a broken <img>. Images that fail to
     load must fall back too: keep an imgError state per card and set
     it in onError, then render the placeholder instead of the <img>.

9. Loading, empty and error states (every list/page that fetches data)
   - Loading: skeleton blocks (animate-pulse rounded-2xl bg-slate-200)
     shaped like the content, not just "Loading...".
   - Empty: centered panel with an emoji or inline SVG icon, a short
     title, a hint and a call-to-action button when one makes sense.
   - Error: the alert style from rule 6.

10. Tables and detail views
   - Tables inside overflow-x-auto rounded-2xl border bg-white;
     thead bg-slate-50 text-xs font-semibold uppercase text-slate-500;
     rows divide-y hover:bg-slate-50.
   - Cart / checkout / detail pages: two columns on large screens
     (lg:grid-cols-3, main content lg:col-span-2) with a summary card
     (lg:sticky lg:top-24). Quantity steppers as small bordered
     buttons. Totals clearly separated with a border-t.

11. Badges: inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium
    with soft colors (bg-emerald-50 text-emerald-700, etc.).

12. Footer: simple border-t bg-white py-8 text-sm text-slate-500.

13. Tailwind v4 setup
   - frontend/src/index.css keeps @import "tailwindcss"; it may add a
     @theme block (e.g. --font-sans) and base styles for body. No
     tailwind.config.js is needed.
   - Do NOT invent CSS class names without definitions. No inline
     style={{}} except for truly dynamic values.
   - Do NOT add npm packages (no icon libraries unless one is already
     in package.json). Use inline SVG icons or emoji.

14. Accessibility: alt text on images, labels on inputs,
    focus-visible rings on interactive elements, sufficient contrast.

==================================================
UI-ONLY CHANGE (KEEP THE APP WORKING)
==================================================

This request is about appearance. Change presentation only:

- Return ONLY presentation files: frontend/src (React pages,
  components, App.jsx layout wrappers, index.css), or for projects
  without React: templates/*.html and static/*.css (Python/Java web
  apps) or the root .html/.css files of a static site. Never return
  server code, backend files, package.json or config files.
- Projects without Tailwind (plain CSS, e.g. Python/Java web apps or
  static sites): apply the same design system by writing equivalent
  CSS classes in the existing stylesheet and using them in the HTML.
  Do not add Tailwind or JavaScript there unless already present.
- Keep every import, export, prop, state variable, effect, API call,
  route path, handler and context usage exactly as it is. Only change
  JSX structure, class names, static text and purely visual elements.
  New state is allowed only for presentation (mobile menu open,
  show password, image load error).
- If the user names specific parts (e.g. "login page", "navbar",
  "home page"), change only the files for those parts (login also
  means signup, so both auth pages stay consistent). Otherwise restyle
  every page.
- If a component needs a new purely presentational helper (e.g. a
  Skeleton or EmptyState component), create it under
  frontend/src/components and import it with the exact path.
- Restyle every page the user sees so the whole app is consistent,
  and return the complete content of each changed file.
`;
