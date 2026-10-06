import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch-form";

export const metadata: Metadata = {
  title: "Launch a Token on NEAR | GHOSTFUN",
  description: "Launch a NEAR token in one wallet-approved transaction. Live Rhea pool, locked liquidity, transparent fees and customizable tax distribution.",
};

export default function LaunchPage() {
  return <LaunchForm />;
}
