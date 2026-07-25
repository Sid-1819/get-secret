import { _encatch, Theme } from "@encatch/web-sdk";
import { useTheme } from "./ThemeProvider";
import { useEffect } from "react";



function encatchThemeFromResolved(theme: Theme): import("@encatch/web-sdk").Theme {
    return theme === "dark" ? "dark" : "light";
}

export default function EncatchFeedback() {
    const { theme } = useTheme();
    const apiKey = import.meta.env.VITE_ENCATCH_PUBLISHABLE_KEY;
    useEffect(() => {
      if (!apiKey) return;
      _encatch.init(apiKey, {
		webHost: import.meta.env.VITE_ENCATCH_WEB_HOST,
		theme: theme === "dark" ? "dark" : "light",
	});
    }, [apiKey, theme]);
    return null;
  }