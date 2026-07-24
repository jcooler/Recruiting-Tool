import Script from "next/script";

/**
 * Sets `data-theme` on `<html>` before first paint, avoiding a light/dark
 * flash. Uses `next/script` with `strategy="beforeInteractive"` rather than a
 * plain `<script>` inside a manually-rendered `<head>`: the App Router's docs
 * advise against hand-rendering `<head>` in layouts, since `<head>` content
 * is otherwise owned exclusively by the Metadata API. `beforeInteractive`
 * scripts are injected by Next.js into the initial HTML itself, ahead of any
 * page content, without requiring a manual `<head>` — so this can render as
 * a normal child anywhere in the tree (see `app/layout.tsx`) and still
 * execute before hydration/paint.
 *
 * Note (Task 33 verification): this does NOT explain or fix the separate
 * Lighthouse `meta-description` SEO finding on `/`. Traced that to
 * `next/dist/server/lib/streaming-metadata.js`'s `shouldServeStreamingMetadata`
 * — Next 15 defers `<title>`/`<meta>` into a streamed `<body>` chunk (React's
 * `$RC` boundary-replacement mechanism) for any request whose User-Agent
 * doesn't match `htmlLimitedBots` (default: Slackbot/Twitterbot/Discordbot/
 * etc. — bots that can't run the replacement script). That check is purely
 * UA-based, unaffected by this file or by manual-`<head>` usage; confirmed
 * empirically (raw HTML still has the meta tag in `<body>`, not `<head>`,
 * after this change). Real browsers and JS-executing crawlers (incl.
 * Google's main crawler) still get correct metadata within milliseconds of
 * load. Left as Next's intentional default rather than widening
 * `htmlLimitedBots` to also match Lighthouse/regular browsers, which would
 * defeat the feature purely to chase the audit score.
 */
export function ThemeScript() {
  const code = `(function(){try{
    var m = document.cookie.match(/(?:^|; )aw_theme=(light|dark)/);
    var t = m ? m[1] : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = t;
  }catch(e){}})();`;
  return <Script id="theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: code }} />;
}
