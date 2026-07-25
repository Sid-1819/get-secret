import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, Copy, ChevronDown, ChevronUp, Loader2, AlertCircle, ArrowRight, Sparkles, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { ApiError, buildShareUrl, secretClient } from "@/lib/api";
import {
  encryptFileForPassword,
  encryptNoteForPassword,
  parseNoteEnvelopeSalt,
} from "@/lib/note-crypto";

const NOTE_MAX_LENGTH = 50_000;

const DEFAULT_MAX_VIEWS = "1";
const DEFAULT_EXPIRY = "5m";

const MAX_VIEWS_OPTIONS = [
  { label: "1 view", value: "1" },
  { label: "3 views", value: "3" },
  { label: "5 views", value: "5" },
];

const EXPIRY_OPTIONS = [
  { label: "2 minutes", value: "2m" },
  { label: "5 minutes", value: "5m" },
  { label: "10 minutes", value: "10m" },
];

const EXPIRY_MS: Record<string, number> = {
  "2m": 2 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "10m": 10 * 60 * 1000,
};

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const FILE_ACCEPT =
  "image/png,image/jpeg,image/webp,application/pdf,text/plain,.png,.jpg,.jpeg,.webp,.pdf,.txt";

function getExpiryDate(value: string): string {
  const now = Date.now();
  const ms = EXPIRY_MS[value] ?? EXPIRY_MS["5m"];
  return new Date(now + ms).toISOString();
}

function isStrongPassword(value: string): boolean {
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;/'`~]/.test(value)) return false;
  return true;
}

function passwordError(value: string): string | null {
  if (!value.trim()) return null;
  if (value.length < PASSWORD_MIN_LENGTH) return `At least ${PASSWORD_MIN_LENGTH} characters`;
  if (value.length > PASSWORD_MAX_LENGTH) return `At most ${PASSWORD_MAX_LENGTH} characters`;
  if (!/[a-z]/.test(value)) return "Add a lowercase letter";
  if (!/[A-Z]/.test(value)) return "Add an uppercase letter";
  if (!/[0-9]/.test(value)) return "Add a digit";
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;/'`~]/.test(value)) return "Add a symbol (e.g. !@#$)";
  return null;
}

export function NoteForm() {
  const [content, setContent] = useState("");
  const [expiry, setExpiry] = useState(DEFAULT_EXPIRY);
  const [maxViews, setMaxViews] = useState(DEFAULT_MAX_VIEWS);
  const [password, setPassword] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noteUrl, setNoteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [createdWithPassword, setCreatedWithPassword] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const hasPayload = Boolean(content.trim() || file);
    if (!hasPayload || content.length > NOTE_MAX_LENGTH) return;
    const pwdErr = password.trim() ? passwordError(password) : null;
    if (pwdErr) {
      setError(`Passphrase: ${pwdErr}`);
      return;
    }
    setLoading(true);
    setError("");

    const basePayload = {
      expiresAt: getExpiryDate(expiry),
      maxViews: Number(maxViews),
    };

    try {
      if (password.trim()) {
        const pwd = password.trim();
        const encContent = await encryptNoteForPassword(content.trim(), pwd);
        if (file) {
          const salt = parseNoteEnvelopeSalt(encContent);
          const buf = new Uint8Array(await file.arrayBuffer());
          const fileEnc = await encryptFileForPassword(buf, pwd, salt);
          const blob = new Blob([fileEnc], { type: "application/octet-stream" });
          const encryptedFile = new File([blob], file.name, { type: "application/octet-stream" });
          const data = await secretClient.createNote({
            content: encContent,
            password: pwd,
            file: encryptedFile,
            attachmentMimeType: file.type || "application/octet-stream",
            attachmentFileName: file.name,
            ...basePayload,
          });
          setNoteUrl(buildShareUrl(window.location.origin, data.slug));
        } else {
          const data = await secretClient.createNote({
            content: encContent,
            password: pwd,
            ...basePayload,
          });
          setNoteUrl(buildShareUrl(window.location.origin, data.slug));
        }
      } else if (file) {
        const data = await secretClient.createNote({
          content: content.trim() || "\u200b",
          file,
          ...basePayload,
        });
        setNoteUrl(buildShareUrl(window.location.origin, data.slug));
      } else {
        const data = await secretClient.createNote({
          content: content.trim(),
          ...basePayload,
        });
        setNoteUrl(buildShareUrl(window.location.origin, data.slug));
      }
      setCreatedWithPassword(Boolean(password.trim()));
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 429) {
        setError(
          e.message ||
            "Too many secrets created. Limit: 3 per minute, 10 per 24 hours. Try again later.",
        );
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(noteUrl);
    setCopied(true);
    toast.success("Secret link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setContent("");
    setExpiry(DEFAULT_EXPIRY);
    setMaxViews(DEFAULT_MAX_VIEWS);
    setPassword("");
    setNoteUrl("");
    setError("");
    setCopied(false);
    setCreatedWithPassword(false);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (noteUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            Your one-time secret link is ready
          </CardTitle>
          <CardDescription>
            {createdWithPassword
              ? "Share this link and the passphrase with your recipient. Content is encrypted in the browser before upload — we cannot read it or recover the passphrase."
              : "This link will self-destruct after it's been viewed. Share it only with the intended recipient."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={noteUrl} className="font-mono text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" onClick={handleReset} className="w-full">
            <Sparkles className="h-4 w-4" />
            Share another secret
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="glass glow-card rounded-xl">
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-2">
          <Textarea
            id="note-content"
            placeholder="Paste or type your secret…"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            maxLength={NOTE_MAX_LENGTH}
            rows={5}
            className="resize-none border-border rounded-xl"
          />
          <CardDescription className="text-right">
            {content.length}/{NOTE_MAX_LENGTH}
          </CardDescription>
          <CardDescription>
            Limit: 3 sealed links per minute, 10 per day per device.
          </CardDescription>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-file">Attachment</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={fileInputRef}
              id="note-file"
              type="file"
              accept={FILE_ACCEPT}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
              {file ? file.name : "Attach file (optional)"}
            </Button>
            {file && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Clear
              </Button>
            )}
          </div>
          <CardDescription>PNG, JPEG, WebP, PDF, or plain text — max 1 MB</CardDescription>
        </div>

        <Collapsible open={showOptions} onOpenChange={setShowOptions}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm">
              More options
              {showOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-2">
              <Label htmlFor="max-views">Max views</Label>
              <Select value={maxViews} onValueChange={setMaxViews}>
                <SelectTrigger id="max-views">
                  <SelectValue placeholder="1 view" />
                </SelectTrigger>
                <SelectContent>
                  {MAX_VIEWS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires-in">Expires in</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger id="expires-in">
                  <SelectValue placeholder="5 minutes" />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="passphrase">Passphrase (optional)</Label>
              <Input
                id="passphrase"
                type="password"
                placeholder="Min 8 chars: upper, lower, digit, symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
              />
              {password.trim() && passwordError(password) && (
                <CardDescription className="text-destructive">{passwordError(password)}</CardDescription>
              )}
              <CardDescription>
                With a passphrase, your note is encrypted in this browser before upload. If you lose the passphrase, the content cannot be recovered.
              </CardDescription>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={
            (!content.trim() && !file) ||
            content.length > NOTE_MAX_LENGTH ||
            (password.trim() !== "" && !isStrongPassword(password)) ||
            loading
          }
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sealing…
            </>
          ) : (
            <>
              Create one-time secret link
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
