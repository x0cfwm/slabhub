// Expo Router delegates incoming system URLs (universal links,
// custom-scheme deep links, Siri handoff, etc.) to this function so
// we can map them onto file-based routes. Returning the path
// unchanged lets Expo Router resolve it against `app/*` — e.g.
// `https://slabhub.gg/vendor/grand-ocelot` -> `app/vendor/[handle].tsx`.
//
// If we ever need to rewrite or gate an incoming URL, add a case here
// before the default return.
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  return path;
}
