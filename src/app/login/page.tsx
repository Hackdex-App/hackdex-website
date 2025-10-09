import LoginForm from "@/components/Auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto my-auto max-w-md w-full px-6 py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-foreground/70">Log in to manage your account and submissions.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-foreground/70">
          New here? <a className="text-[var(--accent)] hover:underline" href="/signup">Create an account</a>
        </p>
      </div>
    </div>
  )
}
