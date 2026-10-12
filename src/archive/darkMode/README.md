# Archived Feature: Dark Mode

## Status
**Archived** (Light mode is the active system default across the public showroom and admin consoles).

## Contents
- `ThemeContext.tsx`: React Context for storing and toggling between `'light'` and `'dark'`, persisting choice to `localStorage` (`nganga_theme_preference`), and updating `document.documentElement.classList`.
- `ThemeToggle.tsx`: Desktop navbar toggle, mobile menu toggle, and bottom-floating widget button.

## How to Reactivate
1. Wrap `<App />` inside `<ThemeProvider>` in `src/main.tsx`.
2. Re-import `<ThemeToggle />` into `src/components/SialkotNavbar.tsx` or `<FloatingThemeToggle />` into `src/App.tsx`.
3. Re-import `<ThemeToggle size="sm" />` into `src/components/AdminDashboard.tsx`.
