"use client";

import { useActionState, useEffect, useState } from "react";
import { signIn, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { LoginDeskCharacter } from "@/components/ui/characters";
import { CONTROL } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [errorPulse, setErrorPulse] = useState(0);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    if (state.error) setErrorPulse((n) => n + 1);
  }, [state]);

  const mood = passwordFocused ? "privacy" : state.error ? "oops" : "ready";

  return (
    <>
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <LoginDeskCharacter mood={mood} />
        <div>
          <h1 className="text-xl font-semibold leading-7 text-ink">SecureDrive CRM</h1>
          <p className="text-xs text-ink-muted">
            {passwordFocused ? "Your password stays private" : "The Future is in Good Hands"}
          </p>
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
            className={cn(CONTROL, "h-10", state.error && "border-negative/60")}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-muted">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            className={cn(CONTROL, "h-10", state.error && "border-negative/60")}
          />
        </label>

        {state.error && (
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
