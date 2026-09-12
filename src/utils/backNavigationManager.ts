// backNavigationManager.ts
// Native Android-style Back Navigation System for Installed PWA / Web App

import { useEffect, useRef } from 'react';

export interface ModalEntry {
  id: string;
  close: () => void;
}

class BackNavigationManager {
  private modalStack: ModalEntry[] = [];
  private tabStack: string[] = ['home'];
  private isHandlingPopState = false;
  private isProgrammaticBack = false;
  private onTabChangeCallback: ((tab: string) => void) | null = null;
  private exitToastCallback: ((msg: string) => void) | null = null;
  private lastBackPressTime = 0;
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    // Initialize root history states for PWA Standalone Mode
    try {
      if (!window.history.state || !window.history.state.pwaType) {
        window.history.replaceState({ pwaType: 'root_base', tab: 'home', depth: 0 }, '');
        window.history.pushState({ pwaType: 'root', tab: 'home', depth: 1 }, '');
      }
    } catch (e) {
      console.warn('History API init warning:', e);
    }

    // Attach global user activation listener to ensure history buffer exists on installed PWA
    const userActivationHandler = () => {
      try {
        if (window.history.length < 2) {
          window.history.pushState({ pwaType: 'root', tab: this.getCurrentTab(), depth: 1 }, '');
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('touchstart', userActivationHandler, { passive: true, once: false });
    window.addEventListener('click', userActivationHandler, { passive: true, once: false });

    window.addEventListener('popstate', this.handlePopState);
  }

  public setOnTabChangeCallback(cb: (tab: string) => void) {
    this.onTabChangeCallback = cb;
  }

  public setExitToastCallback(cb: (msg: string) => void) {
    this.exitToastCallback = cb;
  }

  public getCurrentTab(): string {
    return this.tabStack[this.tabStack.length - 1] || 'home';
  }

  public getActiveModalCount(): number {
    return this.modalStack.length;
  }

  public setInitialTab(tab: string) {
    if (this.tabStack.length <= 1) {
      this.tabStack = [tab];
      try {
        if (typeof window !== 'undefined' && window.history.state) {
          window.history.replaceState({ ...window.history.state, tab }, '');
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // Register a modal when it opens
  public registerModal(id: string, close: () => void): () => void {
    // Prevent duplicate registration of the same modal ID
    const existingIndex = this.modalStack.findIndex(m => m.id === id);
    if (existingIndex !== -1) {
      this.modalStack.splice(existingIndex, 1);
    }

    this.modalStack.push({ id, close });

    // Push state to browser history if not currently inside popstate event
    if (!this.isHandlingPopState && typeof window !== 'undefined') {
      const depth = (window.history.state?.depth || 0) + 1;
      window.history.pushState({ pwaType: 'modal', modalId: id, depth }, '');
    }

    // Return unregister function
    return () => {
      this.unregisterModal(id);
    };
  }

  // Unregister a modal when closed via UI button (e.g. X, Cancel, Backdrop)
  public unregisterModal(id: string) {
    const idx = this.modalStack.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.modalStack.splice(idx, 1);

      // If closed manually via UI button and not handling popstate,
      // sync browser history by stepping back once
      if (!this.isHandlingPopState && typeof window !== 'undefined') {
        if (window.history.state?.pwaType === 'modal' && window.history.state?.modalId === id) {
          this.isProgrammaticBack = true;
          window.history.back();
        }
      }
    }
  }

  // Record tab transition in history
  public onTabChanged(newTab: string) {
    if (this.isHandlingPopState) return;

    const currentTopTab = this.tabStack[this.tabStack.length - 1];
    if (currentTopTab === newTab) return;

    // Don't accumulate endless duplicate entries if user repeatedly clicks tabs
    if (this.tabStack.includes(newTab)) {
      const existingIdx = this.tabStack.indexOf(newTab);
      if (existingIdx !== -1) {
        this.tabStack.splice(existingIdx, 1);
      }
    }

    this.tabStack.push(newTab);

    if (typeof window !== 'undefined') {
      const depth = (window.history.state?.depth || 0) + 1;
      window.history.pushState({ pwaType: 'tab', tab: newTab, depth }, '');
    }
  }

  // Handle hardware Back button or browser Back button press
  private handlePopState = (_e: PopStateEvent) => {
    if (this.isProgrammaticBack) {
      this.isProgrammaticBack = false;
      return;
    }

    this.isHandlingPopState = true;

    try {
      // 1. If any modal, drawer, or dialog is open, close the top-most modal first!
      if (this.modalStack.length > 0) {
        const topModal = this.modalStack.pop();
        if (topModal) {
          topModal.close();
        }
        return;
      }

      // 2. If no modals are open, check tab navigation history
      if (this.tabStack.length > 1) {
        this.tabStack.pop(); // Remove current active tab
        const prevTab = this.tabStack[this.tabStack.length - 1];
        if (prevTab && this.onTabChangeCallback) {
          this.onTabChangeCallback(prevTab);
        }
        return;
      }

      // 3. If on home root tab with only 1 entry and no modals open:
      // Prevent accidental exit / unexpected reload on single back press by requiring double-tap back
      const now = Date.now();
      if (now - this.lastBackPressTime < 2000) {
        // User tapped back twice in 2 seconds -> allow normal browser exit
        return;
      }

      this.lastBackPressTime = now;

      // Re-establish history buffer so single tap back doesn't exit or unload iframe
      if (typeof window !== 'undefined') {
        window.history.pushState({ pwaType: 'root', tab: this.getCurrentTab(), depth: 1 }, '');
      }

      if (this.exitToastCallback) {
        this.exitToastCallback('Press back again to exit');
      }
    } finally {
      this.isHandlingPopState = false;
    }
  };
}

export const backNavManager = new BackNavigationManager();

/**
 * Custom hook to integrate any modal/drawer/dialog state into Android Back navigation.
 */
export function useBackModal(isOpen: boolean, onClose: () => void, modalId: string) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      const unregister = backNavManager.registerModal(modalId, () => {
        onCloseRef.current();
      });
      return () => {
        unregister();
      };
    }
  }, [isOpen, modalId]);
}
