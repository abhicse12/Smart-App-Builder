// Design system for UI changes requested through Modify ("make the UI
// better", "improve the design", ...). Generation keeps its shorter
// styling rules to limit the load on the model; a UI request then
// restyles only the presentational frontend files.

const UI_REQUEST_PATTERN =
  /\b(ui|ux|design|redesign|style|styles|styling|css|tailwind|look|looks|looking|beautiful|attractive|appealing|pretty|modern|polish|layout|theme|colou?rs?|font|fonts|spacing|responsive|decent|ugly|nicer|better looking|visual|appearance)\b/i;

export const isUiRequest = (userRequest = "") =>
  UI_REQUEST_PATTERN.test(String(userRequest));

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

4. Navigation
   - Navbar: sticky top-0 z-40 border-b border-slate-200 bg-white/80
     backdrop-blur. Logo with font-extrabold (gradient text allowed:
     bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text
     text-transparent). Links with hover and active states.
   - Show the logged-in user's name/avatar and a clear Logout button;
     show Login / Sign up buttons when logged out.
   - Collapse links into a menu button on mobile (useState toggle).

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
   - Centered card (min-h-[calc(100vh-4rem)] flex items-center
     justify-center), max-w-md, p-8, logo/title, subtitle, form,
     full-width primary button, link to the other auth page.

8. Lists, cards and catalogs
   - Grid: grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4.
   - Item card: image on top (aspect-[4/3] w-full object-cover,
     group-hover:scale-105 transition inside overflow-hidden), then
     title (font-semibold line-clamp-1), short description
     (line-clamp-2 text-sm text-slate-500), price/badges, and a
     full-width action button.
   - If an item has no image URL, render a gradient placeholder
     (bg-gradient-to-br from-indigo-100 to-violet-100) with the first
     letter of the name, never a broken <img>.

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

- Return ONLY files under frontend/src (pages, components, App.jsx
  layout wrappers, index.css). Never return backend files,
  package.json or config files.
- Keep every import, export, prop, state variable, effect, API call,
  route path, handler and context usage exactly as it is. Only change
  JSX structure, class names, static text and purely visual elements.
- If a component needs a new purely presentational helper (e.g. a
  Skeleton or EmptyState component), create it under
  frontend/src/components and import it with the exact path.
- Restyle every page the user sees so the whole app is consistent,
  and return the complete content of each changed file.
`;
