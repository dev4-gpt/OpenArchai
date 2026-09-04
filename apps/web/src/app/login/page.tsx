import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">OpenArchai</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            formAction={signIn}
            className="flex-1 rounded bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>
          <button
            formAction={signUp}
            className="flex-1 rounded border px-3 py-2 text-sm font-medium"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}
