# Implementation Plan: Categorize & Organize Security & Sync and Audio & Beeps

Reorganize the extensive settings options inside **Security & Sync** and **Audio & Beeps** from long monolithic scrolling lists into modular, minimalist sub-page hubs that mirror the design of **Interface** and **Sync & Database**.

---

## User Review Required

> [!NOTE]
> Based on your selections, both sections will be organized into 3 dedicated sub-pages with interactive main hub menus, active status badges, and smooth back-navigation:
> - **Security & Sync** → PIN Security & Privacy, Cloud Sync & Store Rules, and Gemini API Keys
> - **Audio & Beeps** → Feedback Modes & Alerts, Sound Theme Packs, and Volume Matrix & Speech

---

## Proposed Changes

### `src/components/SettingsScreen.tsx`

#### 1. Security & Sync Sub-Page Hub Architecture
- Introduce `securityPage` state: `'main' | 'pin_security' | 'cloud_sync' | 'api_keys'`.
- **Main Hub (`securityPage === 'main'`)**:
  - **PIN Security & Privacy Protection Card**:
    - Shows live status badge: `PIN Enabled` / `No PIN Set`, stealth mode status.
    - Quick summary of security protections.
    - Navigates to dedicated PIN Security view.
  - **Cloud Synchronization & Store Rules Card**:
    - Shows live status badge: `Auto Sync On` / `Offline Only`, minimum stock threshold.
    - Real-time cloud status indicator.
    - Navigates to dedicated Cloud Sync view.
  - **Voice Assistant & Gemini API Keys Card**:
    - Shows live status badge: `Default Key Active` / `N Keys Stored`.
    - Navigates to dedicated API Key Orchestrator view.
- **Dedicated Sub-Pages**:
  - `pin_security`: Minimalist cards for Master PIN configuration (Initialize / Update / Disable) and Auto Stealth Mode (hide buying price by default).
  - `cloud_sync`: Clean cards for Real-time Cloud Sync toggle, sync indicator, guest warning, and Minimum Stock Level threshold counter.
  - `api_keys`: Full Gemini API Key Orchestrator with Add Key modal trigger, key validation, and quota info.

---

#### 2. Audio & Beeps Sub-Page Hub Architecture
- Introduce `soundPage` state: `'main' | 'feedback_presets' | 'sound_themes' | 'volume_matrix'`.
- **Main Hub (`soundPage === 'main'`)**:
  - **Feedback Modes & Notifications Card**:
    - Shows live status badge: `Sound + Haptic` / `Silent` / `Tactile Only`.
    - Overview of alerts and vibration behavior.
    - Navigates to dedicated Feedback Modes view.
  - **Sound Theme Packs Card**:
    - Shows active sound pack badge: `Modern Digital` / `Classic POS` / `Executive Luxe`.
    - Quick acoustic theme description.
    - Navigates to dedicated Sound Themes view.
  - **Volume Matrix & Speech Card**:
    - Shows live volume and announcement status.
    - Navigates to dedicated Volume & Voice view.
- **Dedicated Sub-Pages**:
  - `feedback_presets`: In-App Alerts toggle, Push Notifications toggle, Master Sound toggle, Haptic Vibration toggle, and General Feedback Mode selector.
  - `sound_themes`: Interactive theme cards with instant sound preview buttons (`Play`) and 1-tap pack activation.
  - `volume_matrix`: Individual event volume synthesizer sliders (Scanner, Add Product, Print, Cash Drawer) and voice readout controls.

---

#### 3. Seamless Back-Navigation Handling
- Synchronize back button behavior in `SettingsScreen`:
  - When inside any sub-page (`securityPage !== 'main'` or `soundPage !== 'main'`), pressing the header Back button returns smoothly to that section's main hub.
  - When at the main hub of any tab, pressing the header Back button returns to the Overview menu.

---

## Verification Plan

### Automated Tests & Compilation
- Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
- Run `compile_applet` (`npm run build`) to ensure build success.

### Manual Verification
1. Navigate to **Settings** > **Security & Sync**:
   - Verify the main hub renders 3 distinct cards with icons, status badges, and arrows.
   - Click each card to verify smooth navigation to the dedicated sub-page and back to the hub.
   - Verify PIN management, Cloud Sync toggles, and API Key management work as expected.
2. Navigate to **Settings** > **Audio & Beeps**:
   - Verify the main hub renders 3 distinct cards with icons, status badges, and arrows.
   - Click each card to verify smooth navigation into Feedback Presets, Sound Themes, and Volume Matrix.
   - Test audio playback preview in Sound Themes to ensure sound feedback triggers cleanly.
