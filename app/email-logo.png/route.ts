import { NextResponse } from "next/server";

/**
 * The Ophthamanager mark, served as a PNG for the auth email templates.
 *
 * Two reasons it lives here as bytes rather than in `public/`:
 *
 * 1. Email clients strip SVG — Gmail and Outlook both — so the templates need a
 *    raster, and they also strip `data:` URIs, so it has to be a real URL.
 * 2. The hosts disagree about `public/`: v2.ophtamanager.de serves it, the
 *    apex answers 404 for every file in it. A route answers on any of them, so an
 *    emailed `{ .SiteURL }/email-logo.png` resolves whichever one site_url
 *    happens to point at.
 *
 * Rasterised from public/logo.svg at 180x96 (2x the 88px the mail displays it
 * at). The proxy matcher skips `.png` paths, so it answers without a session —
 * which it must, since it is fetched by whatever mail client opens the email.
 */
const LOGO_PNG = Buffer.from(
  "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",
  "base64"
);

export function GET() {
  return new NextResponse(LOGO_PNG, {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(LOGO_PNG.byteLength),
      // The bytes only change when the logo does, and then the whole deployment
      // changes with them.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
