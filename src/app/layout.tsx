import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GHOSTFUN | The Next Generation of Onchain Trading",
  description: "GHOSTFUN — discover, trade and launch tokens on NEAR. Live Rhea markets, transparent fees and liquidity locked from day one.",
  keywords: ["GHOSTFUN", "NEAR", "NEAR Protocol", "token launchpad", "Rhea Finance", "onchain trading"],
  openGraph: {
    title: "GHOSTFUN | The Next Generation of Onchain Trading",
    description: "Discover, trade and launch tokens on NEAR. Live Rhea markets, transparent fees and liquidity locked from day one.",
    siteName: "GHOSTFUN",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><AppProviders><SiteHeader />{children}<SiteFooter /></AppProviders></body></html>;
}
