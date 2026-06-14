import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Virality Prediction Simulator",
  description: "AI-powered virality prediction — upload a reel and watch 260 persona agents simulate real engagement"
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface bg-grid bg-radial-gradient min-h-screen">
        {children}
      </body>
    </html>
  );
}
