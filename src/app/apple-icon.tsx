import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Provisional mark: the same rounded chat bubble used by the brand logo.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #1a7566 0%, #0f5c50 55%, #093e36 100%)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 108,
            height: 76,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            background: "#ffffff",
            borderRadius: 26,
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: 99, background: "#0f5c50" }} />
          <div style={{ width: 18, height: 18, borderRadius: 99, background: "#1d9b7d" }} />
          <div style={{ width: 18, height: 18, borderRadius: 99, background: "#0f5c50" }} />
          <div
            style={{
              position: "absolute",
              left: 27,
              bottom: -20,
              width: 28,
              height: 28,
              background: "#ffffff",
              borderRadius: "0 0 0 6px",
              transform: "skewX(20deg)",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
