import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_EXPIRY_PRESET,
  DEFAULT_VIEWS_PRESET,
  EXPIRY_PRESET_IDS,
  FLOATING_ICON_ENABLED_KEY,
  isExpiryPresetId,
  isViewsPresetId,
  migrateNoteStorageIfNeeded,
  NOTE_EXPIRY_PRESET_KEY,
  NOTE_ONE_TIME_VIEW_KEY,
  NOTE_VIEWS_PRESET_KEY,
  type ExpiryPresetId,
  type ViewsPresetId,
  VIEWS_PRESET_IDS,
} from "../defaults.js"
import { buildShareUrl } from "../share-url.js"
import { ThemeToggle } from "./theme-toggle"

function expiryLabel(id: ExpiryPresetId): string {
  switch (id) {
    case "5m":
      return "5 min"
    case "10m":
      return "10 min"
    case "1h":
      return "1 hr"
    case "24h":
      return "24 hr"
    default:
      return id
  }
}

type SaveResp = { slug?: string; error?: string }

export function PopupApp() {
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryPresetId>(
    DEFAULT_EXPIRY_PRESET,
  )
  const [selectedViews, setSelectedViews] = useState<ViewsPresetId>(
    DEFAULT_VIEWS_PRESET,
  )
  const [oneTimeView, setOneTimeView] = useState(false)
  const [iconEnabled, setIconEnabled] = useState(true)
  const [defaultsStatus, setDefaultsStatus] = useState("")
  const [secretText, setSecretText] = useState("")
  const [passphrase, setPassphrase] = useState("")
  const [manualStatus, setManualStatus] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await migrateNoteStorageIfNeeded()
      const data = await chrome.storage.local.get([
        NOTE_EXPIRY_PRESET_KEY,
        NOTE_VIEWS_PRESET_KEY,
        NOTE_ONE_TIME_VIEW_KEY,
        FLOATING_ICON_ENABLED_KEY,
      ])
      if (cancelled) return

      setSelectedExpiry(
        isExpiryPresetId(data[NOTE_EXPIRY_PRESET_KEY])
          ? data[NOTE_EXPIRY_PRESET_KEY]
          : DEFAULT_EXPIRY_PRESET,
      )
      setSelectedViews(
        isViewsPresetId(data[NOTE_VIEWS_PRESET_KEY])
          ? data[NOTE_VIEWS_PRESET_KEY]
          : DEFAULT_VIEWS_PRESET,
      )
      setOneTimeView(data[NOTE_ONE_TIME_VIEW_KEY] === true)
      setIconEnabled(data[FLOATING_ICON_ENABLED_KEY] !== false)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const presetsDisabled = oneTimeView

  const saveDefaults = useCallback(async () => {
    setDefaultsStatus("")
    await chrome.storage.local.set({
      [NOTE_EXPIRY_PRESET_KEY]: selectedExpiry,
      [NOTE_VIEWS_PRESET_KEY]: selectedViews,
      [NOTE_ONE_TIME_VIEW_KEY]: oneTimeView,
      [FLOATING_ICON_ENABLED_KEY]: iconEnabled,
    })
    setDefaultsStatus("Saved.")
  }, [
    iconEnabled,
    oneTimeView,
    selectedExpiry,
    selectedViews,
  ])

  const generateLink = useCallback(async () => {
    setManualStatus("")
    const text = secretText.trim()
    if (!text) {
      setManualStatus("Enter note text.")
      return
    }

    const passwordRaw = passphrase.trim()
    const payload: { text: string; password?: string } = { text }
    if (passwordRaw !== "") payload.password = passwordRaw

    try {
      const res = await new Promise<SaveResp | undefined>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "SAVE_NOTE", payload },
          (response: SaveResp | undefined) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(response)
          },
        )
      })

      if (!res) {
        setManualStatus("No response from extension.")
        return
      }
      if (res.error) {
        setManualStatus(res.error)
        return
      }
      if (!res.slug) {
        setManualStatus("No slug returned.")
        return
      }

      const shareUrl = buildShareUrl(res.slug)
      try {
        await navigator.clipboard.writeText(shareUrl)
        setManualStatus("Link copied to clipboard.")
      } catch {
        setManualStatus(`Saved — copy manually: ${shareUrl}`)
      }
    } catch {
      setManualStatus("Could not generate link.")
    }
  }, [passphrase, secretText])

  const defaultsStatusClass =
    defaultsStatus === "Saved."
      ? "text-green-600 dark:text-green-400"
      : "text-muted-foreground"

  const manualStatusClass = (() => {
    if (!manualStatus) return "text-muted-foreground"
    if (
      manualStatus.startsWith("Link copied") ||
      manualStatus.startsWith("Saved — copy")
    ) {
      return manualStatus.startsWith("Saved — copy")
        ? "text-amber-700 dark:text-amber-400"
        : "text-green-600 dark:text-green-400"
    }
    return "text-destructive"
  })()

  if (!loaded) {
    return (
      <div className="box-border flex w-[300px] items-center justify-center p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="box-border w-[300px] space-y-3 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold tracking-tight">
          Note defaults
        </h1>
        <ThemeToggle />
      </div>

      <Card className="gap-3 py-3">
        <CardHeader className="px-3 pb-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            Defaults for new notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="expiry-select"
              className="text-xs font-medium text-muted-foreground"
            >
              Expiry
            </Label>
            <Select
              value={selectedExpiry}
              onValueChange={(v) => {
                if (v != null && isExpiryPresetId(v)) setSelectedExpiry(v)
              }}
              disabled={presetsDisabled}
            >
              <SelectTrigger id="expiry-select" className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_PRESET_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {expiryLabel(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="views-select"
              className="text-xs font-medium text-muted-foreground"
            >
              Views
            </Label>
            <Select
              value={selectedViews}
              onValueChange={(v) => {
                if (v != null && isViewsPresetId(v)) setSelectedViews(v)
              }}
              disabled={presetsDisabled}
            >
              <SelectTrigger id="views-select" className="w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWS_PRESET_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id} views
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="one-time"
              checked={oneTimeView}
              onCheckedChange={(checked) => {
                setOneTimeView(checked === true)
              }}
              className="mt-0.5"
            />
            <div className="grid gap-1 leading-snug">
              <Label htmlFor="one-time" className="cursor-pointer font-medium">
                One-time view (recommended)
              </Label>
              <p className="text-xs font-normal text-muted-foreground">
                Uses 1 view and 5 minutes — overrides expiry and views above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 py-3">
        <CardHeader className="px-3 pb-0">
          <CardTitle className="text-xs font-semibold text-muted-foreground">
            In-page icon
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="floating-icon"
              checked={iconEnabled}
              onCheckedChange={(checked) => {
                const enabled = checked === true
                setIconEnabled(enabled)
                void chrome.storage.local.set({
                  [FLOATING_ICON_ENABLED_KEY]: enabled,
                })
              }}
            />
            <Label htmlFor="floating-icon" className="cursor-pointer font-normal">
              Show save icon on focused fields
            </Label>
          </div>
        </CardContent>
      </Card>

      <Button type="button" className="w-full" onClick={() => void saveDefaults()}>
        Save defaults
      </Button>
      <p className={`min-h-[1.125rem] text-xs ${defaultsStatusClass}`}>
        {defaultsStatus}
      </p>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          Paste secret & share
        </p>
        <div className="space-y-1">
          <Label htmlFor="secret" className="text-xs text-muted-foreground">
            Note text (required)
          </Label>
          <Textarea
            id="secret"
            rows={4}
            placeholder="Paste your secret…"
            value={secretText}
            onChange={(e) => {
              setSecretText(e.target.value)
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pass" className="text-xs text-muted-foreground">
            Viewer passphrase (optional) — 8+ chars with upper, lower, number,
            symbol
          </Label>
          <Input
            id="pass"
            type="password"
            autoComplete="new-password"
            placeholder="Optional passphrase"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value)
            }}
          />
        </div>
        <Button
          type="button"
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          onClick={() => void generateLink()}
        >
          Generate & copy link
        </Button>
        <p className={`min-h-[1.125rem] text-xs ${manualStatusClass}`}>
          {manualStatus}
        </p>
      </div>
    </div>
  )
}
