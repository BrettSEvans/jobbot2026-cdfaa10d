## Hide Job Search for Non-Admins & Add 'customer' Role

### Changes

**1. DB Migration — Add 'customer' to `app_role` enum + assign to all existing users**

- `ALTER TYPE app_role ADD VALUE 'customer'`
- Update `handle_new_user()` trigger to auto-assign the 'customer' role to every new signup
- Insert 'customer' role for all existing users who don't already have it

**2. `src/pages/Applications.tsx` — Hide "Search Jobs" button for non-admins**

- Import `useUserRoles` hook
- Conditionally render the Search Jobs button only when `isAdmin` is true

**3. `src/App.tsx` — Guard the `/search-jobs` route**

- Wrap the SearchJobs route so non-admins get redirected (e.g. to `/`)
- hide the links and CTAs from  users with out the role of admin so that they don't have access through the UI
- Use `useUserRoles` to check admin status

**4. `src/hooks/useUserRoles.ts` — Add `isCustomer` boolean**

- Add `isCustomer` derived from `roles.includes('customer')` to the return value

### Files


| File                         | Action                                                                  |
| ---------------------------- | ----------------------------------------------------------------------- |
| DB migration                 | Add 'customer' enum value, auto-assign trigger, backfill existing users |
| `src/pages/Applications.tsx` | Conditionally hide Search Jobs button                                   |
| `src/App.tsx`                | Guard `/search-jobs` route for admin-only                               |
| `src/hooks/useUserRoles.ts`  | Add `isCustomer` boolean                                                |
