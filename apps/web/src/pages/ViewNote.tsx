import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock, ArrowRight, Loader2, Download } from "lucide-react";
import { ApiError, getNote } from "@/lib/api";
import { resolveNoteView, type ResolvedNoteView } from "@/lib/resolve-note-view";

const NOTE_VIEW_MESSAGES = [
  "This is your friend's secret. Have a good look.",
  "You've seen it. No take-backsies.",
  "The secret has been revealed. Use your powers wisely.",
  "Consider yourself in the loop. Don't blow it.",
  "You're one of the chosen few. No pressure.",
  "That's the tea. Sip responsibly.",
  "You're in on it now. What happens next is on you.",
  "Secret received. Your mission, should you choose to accept it, is to keep it.",
  "The cat's out of the bag. Be nice to the cat.",
  "You've been let in. Don't let the side down.",
];

function getRandomNoteMessage() {
  return NOTE_VIEW_MESSAGES[Math.floor(Math.random() * NOTE_VIEW_MESSAGES.length)];
}

const ViewNote = () => {
  const randomMessage = useMemo(() => getRandomNoteMessage(), []);
  const { slug } = useParams<{ slug: string }>();
  const metaRef = useRef<HTMLMetaElement | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [resolved, setResolved] = useState<ResolvedNoteView | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const revokeFileUrl = () => {
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!slug) return;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    metaRef.current = meta;
    document.head.appendChild(meta);
    return () => {
      if (metaRef.current && metaRef.current.parentNode) {
        metaRef.current.parentNode.removeChild(metaRef.current);
        metaRef.current = null;
      }
    };
  }, [slug]);

  useEffect(() => {
    revokeFileUrl();
    setResolved(null);
    setResolveError(null);
  }, [slug]);

  const {
    data,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["note", slug],
    queryFn: () => getNote(slug!),
    enabled: Boolean(slug),
    retry: (_, err) => (err as ApiError)?.status !== 404 && (err as ApiError)?.status !== 403,
    gcTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setResolveError(null);
    void (async () => {
      try {
        revokeFileUrl();
        const r = await resolveNoteView(data);
        if (cancelled) {
          if (r.fileUrl) URL.revokeObjectURL(r.fileUrl);
          return;
        }
        fileUrlRef.current = r.fileUrl;
        setResolved(r);
      } catch (e) {
        if (!cancelled) {
          setResolveError(e instanceof Error ? e.message : "Could not display this note");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    return () => {
      revokeFileUrl();
    };
  }, []);

  const unlockMutation = useMutation({
    mutationFn: (pwd: string) => getNote(slug!, pwd),
    onSuccess: async (result, pwd) => {
      setResolveError(null);
      try {
        revokeFileUrl();
        const r = await resolveNoteView(result, pwd);
        fileUrlRef.current = r.fileUrl;
        setResolved(r);
      } catch (e) {
        setResolveError(e instanceof Error ? e.message : "Could not decrypt this note");
      }
    },
  });

  const apiError = error as ApiError | undefined;
  const needPassword =
    isError &&
    apiError?.status === 403 &&
    apiError?.body?.code === "PASSWORD_REQUIRED";
  const wrongPassword =
    unlockMutation.isError &&
    (unlockMutation.error as ApiError)?.body?.code === "INVALID_PASSWORD";
  const rateLimited =
    unlockMutation.isError &&
    (unlockMutation.error as ApiError)?.status === 429;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) return;
    unlockMutation.mutate(unlockPassword.trim());
  };

  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <Button variant="outline-glow" size="lg" asChild>
            <Link to="/">
              Back to home
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (isPending && !needPassword) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="relative">
            <div className="relative glass glow-card rounded-2xl max-w-md w-full p-8 sm:p-10 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-8 w-40 mx-auto" />
                <Skeleton className="h-4 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (needPassword && !resolved) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="relative glass glow-card rounded-2xl max-w-md w-full p-8 sm:p-10 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7 text-primary-foreground" />
            </div>
            <p className="text-center font-medium text-foreground">This note is protected</p>
            <p className="text-sm text-muted-foreground text-center">
              Enter the passphrase to view it.
            </p>
            <form onSubmit={handleUnlock} className="space-y-3">
              <Input
                type="password"
                placeholder="Passphrase"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                className="bg-muted/30 border-border/50"
                autoComplete="current-password"
                disabled={unlockMutation.isPending}
              />
              {wrongPassword && (
                <p className="text-sm text-destructive">Wrong passphrase. Try again.</p>
              )}
              {rateLimited && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Too many wrong attempts. Try again in 15 minutes.
                  </AlertDescription>
                </Alert>
              )}
              {resolveError && (
                <p className="text-sm text-destructive">{resolveError}</p>
              )}
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={!unlockPassword.trim() || unlockMutation.isPending}
              >
                {unlockMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  "Unlock"
                )}
              </Button>
            </form>
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError && !needPassword) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="relative max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Note unavailable</AlertTitle>
              <AlertDescription>
                This note has expired or been consumed.
              </AlertDescription>
            </Alert>
            <Button variant="outline-glow" size="lg" asChild className="w-full">
              <Link to="/">
                Create a new note
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (data && !resolved && !resolveError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (resolveError && !needPassword) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          <Alert variant="destructive" className="max-w-md">
            <AlertTitle>Could not open note</AlertTitle>
            <AlertDescription>{resolveError}</AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  if (!resolved) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="relative glass glow-card rounded-2xl max-w-md w-full p-8 sm:p-10 space-y-5">
            <motion.div
              className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <Lock className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-sm font-mono text-left">
                {resolved.text}
              </pre>
              {resolved.fileUrl && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <a href={resolved.fileUrl} download={resolved.fileLabel ?? "attachment"}>
                      <Download className="w-4 h-4 mr-2" />
                      Download attachment
                    </a>
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground text-sm text-center">
                {randomMessage}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="outline-glow" size="lg" asChild className="w-full">
                <Link to="/">
                  Back to home
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ViewNote;
