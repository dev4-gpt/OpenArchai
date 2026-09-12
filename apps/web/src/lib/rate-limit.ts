// Simple in-memory rate limiter — resets on redeploy/restart and isn't shared
// across serverless instances. Fine for a closed, small user base; revisit if
// this ever needs to hold up against a public audience.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (entry && entry.resetTime > now) {
    if (entry.count >= max) return false;
    entry.count += 1;
    return true;
  }

  rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
  return true;
}
