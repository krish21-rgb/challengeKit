"use client";
import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/auth/actions";

const initialState: FormState = {};
export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  return <form action={action} className="account-form profile-form"><label> Display name <input name="name" autoComplete="name" defaultValue={name} required minLength={1} maxLength={80} /></label><p className="field-help">This is how your name will appear in your teacher space.</p>{state.error && <p className="form-notice form-error" role="alert">{state.error}</p>}{state.success && <p className="form-notice form-success" role="status">{state.success}</p>}<button className="button button-dark" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button></form>;
}
