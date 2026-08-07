import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt =
  "soccer.co.ke — European football news, live scores and Kenyan KPL coverage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoData = await readFile(join(process.cwd(), "public", "logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a1628 0%, #1a0a12 45%, #061208 100%)",
          padding: "56px 64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            width={96}
            height={96}
            alt=""
            style={{ borderRadius: 9999, background: "white" }}
          />
          <span
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            soccer.co.ke
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#bb011c",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Live Now
          </span>
          <span
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: "white",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            European Football & Kenya
          </span>
          <span style={{ fontSize: 32, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>
            Live Scores · News · Tables · Transfers
          </span>
        </div>
        <span style={{ fontSize: 22, color: "rgba(255,255,255,0.5)" }}>
          15 European leagues + Kenyan KPL — free for fans worldwide
        </span>
      </div>
    ),
    { ...size }
  );
}
