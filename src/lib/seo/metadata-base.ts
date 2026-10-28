export function resolveSiteMetadataBase(
  env: Record<string, string | undefined> = process.env
): URL {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
    "https://dew-and-form-az1b.vercel.app",
  ];

  for (const raw of candidates) {
    if (!raw || !raw.trim()) continue;
    try {
      const normalized = /^https?:\/\//i.test(raw.trim())
        ? raw.trim()
        : `https://${raw.trim()}`;
      return new URL(normalized);
    } catch {
      continue;
    }
  }

  return new URL("https://dew-and-form-az1b.vercel.app");
}
