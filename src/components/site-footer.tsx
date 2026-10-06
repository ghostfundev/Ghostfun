import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-glow" />
      <div className="footer-top content-width">
        <div className="footer-brand-area"><Brand /><p>A new frontier for creating, discovering and trading tokens on NEAR. Your assets stay in your wallet.</p><span className="footer-network"><span className="live-dot" /> BUILT ON NEAR MAINNET</span></div>
        <div className="footer-links"><h4>Platform</h4><Link href="/markets">Explore markets</Link><Link href="/launch">Launch a token</Link><Link href="/fees">Fees & rewards</Link></div>
        <div className="footer-links"><h4>Resources</h4><a href="https://docs.near.org" target="_blank" rel="noreferrer">NEAR documentation <ArrowUpRight size={13} /></a><a href="https://dex.rhea.finance" target="_blank" rel="noreferrer">Rhea Finance <ArrowUpRight size={13} /></a><a href="https://nearblocks.io/address/nearlytrade.near" target="_blank" rel="noreferrer">View factory <ArrowUpRight size={13} /></a></div>
        <div className="footer-links"><h4>Connect</h4><a href="https://near.org" target="_blank" rel="noreferrer">NEAR ecosystem <ArrowUpRight size={13} /></a><a href="https://nearly.trade" target="_blank" rel="noreferrer">Nearly protocol <ArrowUpRight size={13} /></a></div>
      </div>
      <div className="footer-bottom content-width"><span>© {new Date().getFullYear()} GHOSTFUN. Built for the open internet.</span><span>Non-custodial · Powered by NEAR & Rhea</span></div>
    </footer>
  );
}
