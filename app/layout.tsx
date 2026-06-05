import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import CustomCursor from "@/components/CustomCursor";
import "./globals.css";

// Placeholder fonts — to be swapped for the final ones later.
// Elegant serif for the poetic text, sans for the UI.
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
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
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <CustomCursor />
      </body>
    </html>
  );
}
