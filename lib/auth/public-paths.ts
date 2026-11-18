const PUBLIC_EXACT = ["/manifest.json"];
const PUBLIC_PREFIXES = ["/signin", "/star-history", "/api/svg", "/icons"];
const PUBLIC_FILE = /^\/[^/]+\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$/;

export function isPublicPath(pathname: string) {
  if (PUBLIC_FILE.test(pathname) || PUBLIC_EXACT.includes(pathname))
    return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
