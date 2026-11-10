"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LoginDeskCharacter, type LoginMascotMood } from "@/components/ui/characters";
import { CONTROL } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [errorPulse, setErrorPulse] = useState(0);
  const [dismissedError, setDismissedError] = useState(false);

  const [email, setEmail] = useState("");
  const [activeField, setActiveField] = useState<"email" | "password" | null>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [waveKey, setWaveKey] = useState(0);

  useEffect(() => {
    if (state.error) {
      setDismissedError(false);
      setErrorPulse((n) => n + 1);
    }
  }, [state]);

  const showError = Boolean(state.error && !dismissedError);
  const emailHandle = email.includes("@") ? email.split("@")[0].trim().slice(0, 18) : "";
  const mood: LoginMascotMood = pending
    ? "checking"
    : activeField === "password"
      ? showPassword
        ? "peek"
        : "privacy"
      : showError
        ? "oops"
        : activeField === "email"
          ? "email"
          : "ready";

  const subtitle =
    mood === "checking"
      ? "Checking your credentials…"
      : mood === "privacy"
        ? "Your password stays private"
        : mood === "peek"
          ? "Peeking — make sure nobody is behind you"
          : mood === "oops"
            ? "Hmm, those credentials didn't match"
            : emailHandle
              ? `Signing in as ${emailHandle}`
              : "The Future is in Good Hands";

  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <button
          type="button"
          onClick={() => setWaveKey((k) => k + 1)}
          title="Say hi to Pip"
          className="cursor-pointer rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          <LoginDeskCharacter mood={mood} emailProgress={Math.min(1, email.length / 26)} waveKey={waveKey} />
        </button>
        <div>
          <h1 className="text-xl font-semibold leading-7 text-ink">SecureDrive CRM</h1>
          <p className="text-xs text-ink-muted transition-colors duration-150">{subtitle}</p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-muted">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onFocus={() => setActiveField("email")}
            onBlur={() => setActiveField((prev) => (prev === "email" ? null : prev))}
            onChange={(e) => {
              setEmail(e.target.value);
              if (showError) setDismissedError(true);
            }}
            className={cn(CONTROL, "h-10", showError && "border-negative/60")}
          />
        </label>

        <div
          className="flex flex-col gap-1.5"
          onFocusCapture={() => setActiveField("password")}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setActiveField((prev) => (prev === "password" ? null : prev));
            }
          }}
        >
          <span className="text-xs font-medium text-ink-muted">Password</span>
          <div
            className={cn(
              "flex h-10 items-center overflow-hidden rounded-control border bg-white/80 transition-colors",
              showError
                ? "border-negative/60 focus-within:border-negative"
                : "border-divider focus-within:border-accent-strong",
            )}
          >
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              onChange={() => {
                if (showError) setDismissedError(true);
              }}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword((v) => !v)}
              className="grid h-full w-9 shrink-0 place-items-center text-ink-faint transition-colors hover:text-ink"
            >
              {showPassword ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {showError && (
          <p key={errorPulse} role="alert" className="micro-shake rounded-control bg-negative-soft px-3 py-2 text-xs text-negative">
            {state.error}
          </p>
        )}

        <Button type="submit" loading={pending} className="w-full">
          Sign in
        </Button>
      </form>
    </>
  );
}
