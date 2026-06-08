import type { Metadata } from "next";
import { Caudex, Sono } from "next/font/google";
import CustomCursor from "@/components/CustomCursor";
import "./globals.css";

// Serif for the poetic text, mono (Sono) for the player / UI labels.
const serif = Caudex({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
});

const mono = Sono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Water Experience",
  description: "A WebGL watercolor journey through Vivaldi's four seasons.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>
        {children}
        <CustomCursor />
      </body>
    </html>
  );
}
