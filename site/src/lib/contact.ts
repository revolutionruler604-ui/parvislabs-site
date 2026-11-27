// The contact address comes from the build environment and never from git.
// With it unset, every contact link goes to the About page and no address prints.
export const contact: string | undefined = import.meta.env.PUBLIC_CONTACT_EMAIL || undefined;

export function contactHref(subject?: string): string {
  if (!contact) return '/about/';
  return subject ? `mailto:${contact}?subject=${encodeURIComponent(subject)}` : `mailto:${contact}`;
}
