"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { login, register, type FormState } from "@/app/auth/actions";

const initialState: FormState = {};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const [state, action, pending] = useActionState(registering ? register : login, initialState);
  return (
    <form action={action} className="account-form">
      {registering && <label> Your name <input name="name" autoComplete="name" required minLength={1} maxLength={80} placeholder="How should we call you?" /></label>}
      <label> Email address <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@school.com" /></label>
      <label> Password <input name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? 8 : undefined} maxLength={72} placeholder={registering ? "At least 8 characters" : "Your password"} /></label>
      {registering && <label> Confirm password <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} placeholder="One more time" /></label>}
      {state.error && <p className="form-notice form-error" role="alert">{state.error}</p>}
      {state.success && <p className="form-notice form-success" role="status">{state.success}</p>}
      <button className="button button-dark account-submit" type="submit" disabled={pending}>{pending ? "One moment…" : registering ? "Create teacher account" : "Sign in"} <ArrowRight size={17} /></button>
      <p className="auth-switch">{registering ? "Already have an account? " : "New to challengeKit? "}<Link href={registering ? "/login" : "/register"}>{registering ? "Sign in" : "Create an account"}</Link></p>
    </form>
  );
}
