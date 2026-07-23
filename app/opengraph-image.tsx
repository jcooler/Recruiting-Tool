import { ImageResponse } from "next/og";

// Static (no request-dependent data), so Next can generate this once at
// build time rather than per-request — matches the rest of the marketing
// route, which has no dynamic segments either.
export const alt = "ApplicantWizard — modern applicant tracking";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENT = "#6366f1";
const BG = "#0b0b10";
const TEXT = "#f4f4f6";
const TEXT_2 = "#9494a1";

/**
 * Social-card image for every page under this segment (Next's file
 * convention auto-wires this into both `og:image` and `twitter:image` meta
 * tags — see `app/layout.tsx`, which deliberately omits `openGraph.images`
 * so this stays the single source of truth). Built with plain flex/text
 * nodes rather than an inline `<svg>` mark: Satori's box-model layout is
 * far more reliable than its SVG support, and the "AW" monogram square here
 * doubles as the same mark used in the app sidebar and landing nav, so the
 * brand touchpoint stays consistent even without the favicon's spark glyph.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          backgroundColor: BG,
          backgroundImage: `radial-gradient(circle at 82% 8%, rgba(99,102,241,0.35), rgba(99,102,241,0) 55%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand signature */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 56 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: ACCENT,
              color: "#ffffff",
              fontSize: 17,
              fontWeight: 700,
              marginRight: 14,
            }}
          >
            AW
          </div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, letterSpacing: -0.2, color: TEXT }}>
            ApplicantWizard
          </div>
        </div>

        {/* Headline block with accent rule */}
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", width: 8, borderRadius: 4, backgroundColor: ACCENT, marginRight: 32 }} />
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 900 }}>
            <div
              style={{
                display: "flex",
                fontSize: 66,
                fontWeight: 700,
                letterSpacing: -1.5,
                lineHeight: 1.08,
                color: TEXT,
              }}
            >
              Modern applicant tracking
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 28,
                fontSize: 30,
                lineHeight: 1.4,
                color: TEXT_2,
              }}
            >
              One pipeline board, resume parsing, and hiring analytics —
              built for teams who&apos;d rather be interviewing.
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
