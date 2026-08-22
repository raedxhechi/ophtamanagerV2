import Link from "next/link";

/**
 * The eye from public/logo.svg, inlined.
 *
 * Not `<img src="/logo.svg">`: the apex host serves nothing out of `public/`
 * (v2 does), and a logo that disappears on one deployment is worse than three
 * lines of markup. Inlining also saves a request for 600 bytes.
 *
 * The viewBox is cropped to the mark itself — the file's own 200x200 canvas is
 * mostly empty above and below, which would leave this floating in its tile.
 */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="15 56 169 88"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#2670B1" d="M100 56.5A84.5 43.5 0 0 0 100 143.5Z" />
      <path fill="#E44953" d="M100 56.5A84.5 43.5 0 0 1 100 143.5Z" />
      <circle cx="100" cy="100" r="20.5" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-white" aria-label="Home">
      {/* Solid white, where the placeholder icon sat on a translucent tile: the
          mark's blue half all but vanishes against the blue header. */}
      <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-sm">
        <LogoMark className="w-7" />
      </div>
      <span className="hidden text-lg font-semibold tracking-tight sm:inline-block">
        Ophtamanager
      </span>
    </Link>
  );
}
