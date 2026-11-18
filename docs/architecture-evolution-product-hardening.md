# Architecture evolution / product hardening documentation

This doc lists prioritized technical debt and product hardening topics for the next team. Each topic includes where it lives in the codebase, the current issue or state, and a suggested direction.

---

## 1. Multi-role support

- **Where:** [src/server/db/schema/users.ts](../src/server/db/schema/users.ts) has a single `role` column (pgEnum `app_role`); [src/constants/roles.tsx](../src/constants/roles.tsx) defines `RolesEnum`; [src/server/api/middlewares/user-role-middleware.ts](../src/server/api/middlewares/user-role-middleware.ts) and permission/UI logic assume one role per user.
- **Current state:** Each user has exactly one role (e.g. ORGANIZATION_ADMIN or PARENT). An org admin who is also a parent cannot be both in the current model.
- **Desired evolution:** Users can have **multiple roles** (e.g. org admin + parent), so the same person can use admin flows and parent flows without switching accounts or losing one role.
- **Suggested direction:** Introduce a user–role junction (e.g. `users_roles` table with userId + role) or an array of roles on the user; migrate from single `users.role` to many roles; update middleware to resolve "effective" permissions from all assigned roles (e.g. union of role_permissions); update UI (role display, invite flows, RLS) to handle multiple roles; consider backward compatibility during migration (e.g. populate new structure from existing `users.role`).

---

## 2. E2E-only with Playwright

- **Where:** [docs/testing.md](testing.md); E2E tests in `e2e/*.spec.ts`.
- **Issue:** No unit or integration tests; refactors lack fast feedback.
- **Suggested direction:** Consider adding unit tests for critical service logic and shared utils; E2E remains the primary acceptance layer.

---

## 3. Error/toast consistency

- **Where:** Components use both `toast.error()` and `toastError()` (e.g. [src/components/campaigns/campaigns-form.tsx](../src/components/campaigns/campaigns-form.tsx), [src/components/tracking/cases-checkout-form.tsx](../src/components/tracking/cases-checkout-form.tsx)).
- **Issue:** Inconsistent error reporting and UX.
- **Suggested direction:** Standardize on one approach (e.g. always `toastError` from `@/utils/errors`) and document in frontend rules.

---

## 4. organizations_users only for org admins/staff; participants only on campaigns_users

- **Where:** [src/server/db/schema/organizations-users.ts](../src/server/db/schema/organizations-users.ts), [src/server/db/schema/campaigns-users.ts](../src/server/db/schema/campaigns-users.ts); services such as [src/server/services/organizations-users/organizations-users-get-all-participants.ts](../src/server/services/organizations-users/organizations-users-get-all-participants.ts).
- **Current state:** `organizations_users` holds both staff/admin and participant membership; `campaigns_users` holds per-campaign participation.
- **Desired evolution:** Restrict `organizations_users` to org admins and org staff only; participants exist only in `campaigns_users`; org-level participant lists derived from campaigns_users.
- **Suggested direction:** Plan migration: identify reads/writes of participants via organizations_users; switch participant listing/creation to campaigns_users; stop writing new participants to organizations_users; update RLS and permissions.

---

## 5. Large campaigns-users-list file

- **Where:** [src/components/campaigns-users/campaigns-users-list.tsx](../src/components/campaigns-users/campaigns-users-list.tsx) (~1000 lines).
- **Issue:** Single large component mixing table config, filters, selection, modals, and invalidation logic.
- **Suggested direction:** Split into smaller components (e.g. table columns config, filter bar, selection bar, modal wrappers) and/or extract custom hooks for pagination, filters, and selection state.
