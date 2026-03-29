import type { Metadata } from "next";
import { Geist, Geist_Mono, UnifrakturMaguntia, Press_Start_2P } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Medieval styled display font for the header/title
const medievalDisplay = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-medieval-display",
});

// Retro pixel font (subtle usage for HUD / labels)
const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Backstabber",
  description: "Backstabber – a 2D stealthy arena with AI opponents.",
  openGraph: {
    title: "Backstabber",
    description: "Backstabber – a 2D stealthy arena with AI opponents.",
    images: [
      {
        url: "dagger.png",
        width: 256,
        height: 256,
        alt: "Backstabber dagger",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Backstabber",
    description: "Backstabber – a 2D stealthy arena with AI opponents.",
    images: ["dagger.png"],
  },
  icons: {
    icon: "dagger.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              function getInitialColorMode() {
                const persistedColorPreference = window.localStorage.getItem('theme');
                if (persistedColorPreference) {
                  return persistedColorPreference;
                }
                
                const hasMediaQuery = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (hasMediaQuery) {
                  return 'dark';
                }
                
                return 'light';
              }

              const colorMode = getInitialColorMode();
              
              if (colorMode === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            })();
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${medievalDisplay.variable} ${pixelFont.variable} antialiased bg-app text-app-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
