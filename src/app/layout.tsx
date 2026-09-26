import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  title: {
    default: "Zarina Hotels — All in Georgia | Batumi",
    template: "%s | Zarina Hotels",
  },
  description:
    "Zarina Hotels in Batumi, Georgia. Spa, Turkish hamam, restaurant and 73 rooms in the heart of the city. Book direct for the best available rate.",
  openGraph: {
    type: "website",
    siteName: "Zarina Hotels",
    title: "Zarina Hotels — All in Georgia",
    description: "Spa, Turkish hamam and the Black Sea in the heart of Batumi. Book direct.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
