import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

const messages: Record<string, string> = {
  auth: "Please sign in to access your teacher space.",
  configuration: "Authentication is not configured yet. Please contact the site administrator.",
  access: "We couldn’t verify a teacher profile for this account. Please contact the site administrator.",
  confirmation: "We couldn’t complete email confirmation. Please try signing in or open the confirmation link in the browser where you registered.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <AuthShell title="Welcome back." description="Ready for more little wins? Sign in to your teacher space.">
    {reason && messages[reason] && <p className="form-notice form-info" role="status">{messages[reason]}</p>}
    <AuthForm mode="login" />
  </AuthShell>;
}
