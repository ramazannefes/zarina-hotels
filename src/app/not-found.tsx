import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#FDFBF7", color: "#1C1917" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "96px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#8F7238" }}>404</p>
          <h1 style={{ fontSize: 32, marginTop: 12 }}>Page not found</h1>
          <p style={{ color: "#78716C", marginTop: 12, fontSize: 14 }}>The page you are looking for has moved or never existed.</p>
          <a href="/en" style={{ display: "inline-block", marginTop: 32, background: "#65242E", color: "#FDFBF7", padding: "10px 24px", textDecoration: "none", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Zarina Hotels
          </a>
        </div>
      </body>
    </html>
  );
}
