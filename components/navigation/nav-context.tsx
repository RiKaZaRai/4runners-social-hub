'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode
} from 'react';

const COMPACT_BREAKPOINT = 1680;

interface NavContextType {
  // Mode based on viewport width
  isCompactMode: boolean;

  // Secondary menu state
  isSecondaryVisible: boolean;
  isSecondaryPinned: boolean;
  activePrimaryItem: string | null;

  // Actions
  setActivePrimaryItem: (item: string | null) => void;
  toggleSecondaryPinned: () => void;
  showSecondary: (item: string) => void;
  hideSecondary: () => void;
}

const NavContext = createContext<NavContextType | null>(null);

export function useNav() {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within NavProvider');
  }
  return context;
}

interface NavProviderProps {
  children: ReactNode;
}

export function NavProvider({ children }: NavProviderProps) {
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isSecondaryPinned, setIsSecondaryPinned] = useState(false);
  const [activePrimaryItem, setActivePrimaryItem] = useState<string | null>(null);
  const [isSecondaryVisible, setIsSecondaryVisible] = useState(false);

  // Handle viewport resize
  useEffect(() => {
    const checkViewport = () => {
      const compact = window.innerWidth < COMPACT_BREAKPOINT;
      setIsCompactMode(compact);

      // In comfort mode, secondary is always visible if there's an active item
      if (!compact && activePrimaryItem) {
        setIsSecondaryVisible(true);
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, [activePrimaryItem]);

  // Show secondary menu (with delay for hover)
  const showSecondary = useCallback((item: string) => {
    setActivePrimaryItem(item);
    setIsSecondaryVisible(true);
  }, []);

  // Hide secondary menu (only if not pinned)
  const hideSecondary = useCallback(() => {
    if (!isSecondaryPinned) {
      setIsSecondaryVisible(false);
    }
  }, [isSecondaryPinned]);

  // Toggle pin state
  const toggleSecondaryPinned = useCallback(() => {
    setIsSecondaryPinned((prev) => !prev);
  }, []);

  // Handle Escape key to close secondary
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSecondaryVisible && !isSecondaryPinned) {
        setIsSecondaryVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSecondaryVisible, isSecondaryPinned]);

  return (
    <NavContext.Provider
      value={{
        isCompactMode,
        isSecondaryVisible,
        isSecondaryPinned,
        activePrimaryItem,
        setActivePrimaryItem,
        toggleSecondaryPinned,
        showSecondary,
        hideSecondary
      }}
    >
      {children}
    </NavContext.Provider>
  );
}
