import { signIn, signUp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">OpenArchai</h1>
          <p className="text-sm text-muted">Floorplan to 3D model to styled render.</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {message && <p className="text-sm text-success">{message}</p>}

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input id="email" name="email" type="email" required />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input id="password" name="password" type="password" required minLength={6} />
        </div>

        <div className="flex gap-2 pt-1">
          <Button formAction={signIn} variant="primary" className="flex-1">
            Sign in
          </Button>
          <Button formAction={signUp} variant="secondary" className="flex-1">
            Sign up
          </Button>
        </div>
      </form>
    </div>
  );
}
