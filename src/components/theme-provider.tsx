"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

export type ThemeMode = "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "soccer-theme";

function applyDarkTheme() {
  const root = document.documentElement;
  root.setAttribute("data-theme", "dark");
  root.style.colorScheme = "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", "#07060f");
}

/** Inline boot script — always dark. */
export const themeBootScript = `(function(){try{localStorage.setItem(${JSON.stringify(STORAGE_KEY)},"dark");document.documentElement.setAttribute("data-theme","dark");document.documentElement.style.colorScheme="dark";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","#07060f");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyDarkTheme();
    try {
      localStorage.setItem(STORAGE_KEY, "dark");
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((_next: ThemeMode) => {
    applyDarkTheme();
  }, []);

  const toggleTheme = useCallback(() => {
    applyDarkTheme();
  }, []);

  const value = useMemo(
    () => ({ theme: "dark" as const, setTheme, toggleTheme }),
    [setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
