import { createContext, useCallback, useContext, useLayoutEffect, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: (event?: MouseEvent<HTMLElement>) => void;
}>({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("getsecret-theme") as Theme) || "dark";
    }
    return "dark";
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("getsecret-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback((event?: MouseEvent<HTMLElement>) => {
    const cx = event?.clientX ?? window.innerWidth / 2;
    const cy = event?.clientY ?? window.innerHeight / 2;
    document.documentElement.style.setProperty("--vt-anchor-x", `${cx}px`);
    document.documentElement.style.setProperty("--vt-anchor-y", `${cy}px`);

    const switchTheme = () => {
      flushSync(() => {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
      });
    };

    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
