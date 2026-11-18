# UI guidelines — World's Finest Chocolate fundraising app

These rules describe the app as it already is. Every screen sits in `app-shell.html`; styling comes from `prototype-utils.css` on top of the tokens in `src/styles/globals.css`.

## Navigation

1. **One left sidebar is the only main navigation, never a top nav** — the dashboard layout is a sidebar plus an inset content area.
2. **Sidebar order is fixed: Dashboard, Members, Organizations, Fundraisers, Prizes, Payments, Permission Slips, Inventory, Messages, Payment Portal, Documentation, Permissions, Email Templates** — this is the order of the app's navigation list, so designs must not reorder it.
3. **Show only the items a role may see; never grey out the rest** — the app filters items by role, so an item the user can't use isn't rendered. The shell lists all of them as a superset.
   - Admin and WFC Admin: Members, Permissions and Email Templates.
   - Organization and sales roles: Organizations.
   - Participant and Parent: Fundraisers, Payments and Permission Slips. Prizes is Participant-only and Inventory is Parent-only.
   - Messages is shown to every role except WFC Admin.
4. **Payment Portal and Documentation open in a new tab and carry an external-link mark** — they leave the dashboard.
5. **Below the main list, staff roles get a collapsible "Fundraisers" group: organization, then its fundraisers, newest first** — Parents and Participants already have a Fundraisers item, so they don't get the group.
6. **The signed-in user lives in the sidebar footer: name, role label, and a menu with Switch Role (only when the user has several roles), Profile and Log out** — role switching reloads the dashboard, so it belongs with the account, not in the page.
7. **On phones the sidebar collapses behind a menu button in the top bar; the header carries the logo and the button** — the real app opens the sidebar as a sheet from a menu button.
8. **Mark the current section with `aria-current="page"` on its `data-nav-key` link** — the shell styles that state with `--sidebar-accent` and `--sidebar-accent-foreground`.
9. **Screens before sign-in or outside the dashboard (sign up, accept invitation, payment, Stripe Connect onboarding) use a split layout with no sidebar: form on the left, brand image on the right, logo centered on top on phones** — these flows are standalone pages in the app, not dashboard screens.
10. **A screen's title matches its nav label (for example "Fundraisers")** — the app builds browser titles from these labels as `Title - App name`.

## Layout and density

1. **Content is one column of `.card` blocks in the inset area, capped at the 2xl width and centered** — the dashboard inset is limited to the 2xl screen width.
2. **Compose with `.stack` (vertical), `.cluster` (inline) and `.grid` with `.grid-2` / `.grid-3` / `.grid-4`; don't add custom spacing** — the utilities use steps of `--radius`.
3. **Density is comfortable, not compact: `.btn` is 2.5rem tall, `.btn-sm` 2.25rem, `.btn-lg` 2.75rem; `.input` matches the default button** — users are parents, volunteers and students on phones, so targets stay large.
4. **Use the three radius tiers as the classes do: cards are the roundest, controls medium, chips and menu items smallest** — this mirrors the app's `card`, `control` and `chip` radii.
5. **Depth comes only from `--elev-1` (resting card), `--elev-2` (menus, hover, toast), `--elev-3` (modal, drawer) and `--shadow-hero` (`.card-hero`, one per screen at most)** — the shadows are tinted with the brand brown, so they match the page.
6. **Lists of records are data tables on desktop and stacked `.card` rows on phones** — the app is table-heavy and the shell must work at 375px.

## Which class for which job

| Job | Use | Reason |
| --- | --- | --- |
| The one main action on a screen | `.btn.btn-primary` | the primary brown is the brand action color |
| Secondary action, cancel, back | `.btn-secondary` | white with a border sits calmly next to primary |
| Tertiary and toolbar actions | `.btn-ghost`, and `.btn-icon` for icon-only | keeps toolbars light |
| Delete, remove, revoke | `.btn-danger`, always behind a `.modal` confirm | destructive actions are confirmed in a dialog |
| Form rows | `.field` with `.input`, `.textarea`, `.select`; errors via `.is-invalid` plus `.field-error` | label, hint and error stay attached to the control |
| Yes/no choice that applies immediately | `.switch` | a switch takes effect now; a `.checkbox` waits for submit |
| Pick one of a few | `.radio` in a `.stack-sm`; many options use `.select` | short lists stay visible |
| Row actions, account menu, role switch | `.dropdown` with `.dropdown-item`; mark the active choice `aria-checked="true"` | the app uses dropdown menus with a checkmark for the active role |
| Switch between views of the same record | `.tabs` / `.tab` | tabs change the view, not the page |
| FAQ, help and long optional detail | `.accordion` with `.disclosure` | help content stays collapsed until needed |
| Grouped content | `.card`; whole card clickable uses `.card-interactive` | cards are the app's one container |
| Status of an order, payment or fundraiser | `.badge` neutral/success/warning/danger | one color per state across the app |
| Filters and tags | `.chip` (`aria-pressed="true"` when on) | chips are toggles, badges are read-only |
| People and organizations | `.avatar`, plus an initial when there is no photo | initials fill the same slot as a photo |
| Edit a record without leaving the list | `.drawer` (right side) | the list stays visible behind it |
| Confirm, terms and conditions | `.modal` with `.backdrop` | the app gates these in a dialog |
| Result of an action | `.toast` (top center, `.toast-success` / `.toast-danger`) | the app's toaster is top-center |
| Page-level notice (maintenance, staging) | `.alert`, info or warning, above the content | notices sit above the shell content |
| Nothing here yet | `.empty-state` with one primary `.btn` | an empty state always offers the next step |
| Loading | `.skeleton` for blocks and tables, `.spinner` inside a button | the sidebar already loads with skeletons |

## Theme

1. **The theme is light and warm: page `--background` (cream), text and primary `--primary` (brown), cards `--card` (white)** — the app only ships this look.
2. **Don't build a dark mode** — the `.dark` token set is defined but the app never switches it on.
3. **The brown palette steps and bright pastels in the Tailwind config (`brown-*`, `pink-*`, `yellow-*`, `orange-*`, `blue-*`, `creamy-50`) are for illustration and role tints, not UI chrome** — chrome uses the semantic tokens.
4. **Use `--chart-1` to `--chart-5` for data series only, in order** — they aren't status colors.
5. **Status colors are `--success`, `--warning`, `--destructive`, each with its `-foreground`; never use red or green for decoration** — color then always means state.
6. **Use the script face (`.font-script`, Mr Dafoe) only for brand moments, never for body text, labels or data** — body uses Rethink Sans.
7. **The sidebar header shows the wide WFC logo in a white, bordered, rounded box, and the small mark when the sidebar is collapsed; the W mark (`w-logo.svg`) is for compact brand spots** — the app swaps the two by sidebar state.

## Voice and tone

1. **Warm and plain, with the sweetness light: "Fundraisers", "Organizations", "Members"** — the product calls its campaigns "fundraisers" in the UI.
2. **Say "Fundraiser", not "campaign", in any user-facing text** — the routes say campaign, but the labels, page titles and empty states say fundraiser.
3. **Buttons are a verb and an object in Title Case for nav, sentence case for actions ("Save changes")** — nav labels in the app are Title Case.
4. **Errors say what to do next, in one sentence, without blame ("Failed to switch role" becomes "We couldn't switch your role. Try again.")** — users are volunteers, not admins.
5. **Name roles exactly as the app does: Admin, WFC Admin, Sales Manager, Fundraising Consultant, Organization Admin, Organization Staff, Participant, Parent** — these are the role labels shown in the account menu.
6. **Money and progress are specific and positive ("$120 raised of $500")** — fundraising progress is the thing users come to see.
