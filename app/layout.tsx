import type { Metadata } from "next";
import { Caudex, Inter, Sono } from "next/font/google";
import CustomCursor from "@/components/CustomCursor";
import "./globals.css";

// Serif for the poetic text, sans for the UI, mono (Sono) for the player.
const serif = Caudex({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
});

const mono = Sono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Water Experience",
  description: "Une expérience WebGL — texture, distorsion, parallax inversé.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <CustomCursor />
      </body>
    </html>
  );
}
