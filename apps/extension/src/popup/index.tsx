import "../../index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { PopupApp } from "./PopupApp"
import { ThemeProvider } from "./theme-provider"

const root = document.getElementById("root")
if (!root) throw new Error("missing #root")

createRoot(root).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="vanixx-popup-theme"
    >
      <PopupApp />
    </ThemeProvider>
  </StrictMode>,
)
