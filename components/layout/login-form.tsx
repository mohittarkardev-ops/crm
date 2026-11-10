"use client";

import { useActionState, useEffect, useState } from "react";
import { signIn, type LoginState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { CONTROL } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [errorPulse, setErrorPulse] = useState(0);

  useEffect(() => {
    if (state.error) setErrorPulse((n) => n + 1);
  }, [state]);

  return (
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
  );
}
