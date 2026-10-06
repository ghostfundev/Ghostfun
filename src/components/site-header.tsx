"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, ChevronDown, LogOut, Menu, Wallet, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { useWallet } from "@/components/providers";
import { shortAddress } from "@/lib/format";

export function SiteHeader() {
  const pathname = usePathname();
  const { accountId, ready, connect, disconnect } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <div className="nav-group">
            <button className={`nav-trigger ${pathname.startsWith("/markets") || pathname.startsWith("/trade") ? "active" : ""}`} type="button">Explore <ChevronDown size={13} /></button>
            <div className="nav-dropdown">
              <Link href="/markets" className="nav-dropdown-link"><span className="nav-dropdown-icon">↗</span><span><b>Explore markets</b><small>Find your next conviction</small></span><ArrowUpRight size={15} /></Link>
              <Link href="/markets?sort=trending" className="nav-dropdown-link"><span className="nav-dropdown-icon">✧</span><span><b>Trending now</b><small>See what is moving on NEAR</small></span><ArrowUpRight size={15} /></Link>
            </div>
          </div>
          <Link href="/launch" className={`nav-plain ${pathname === "/launch" ? "active" : ""}`}>Launchpad</Link>
          <div className="nav-group">
            <button className={`nav-trigger ${pathname === "/fees" ? "active" : ""}`} type="button">Ecosystem <ChevronDown size={13} /></button>
            <div className="nav-dropdown">
              <Link href="/fees" className="nav-dropdown-link"><span className="nav-dropdown-icon">%</span><span><b>Fees & rewards</b><small>Know exactly where it goes</small></span><ArrowUpRight size={15} /></Link>
              <Link href="/#how-it-works" className="nav-dropdown-link"><span className="nav-dropdown-icon">◈</span><span><b>How it works</b><small>Trading, built for everyone</small></span><ArrowUpRight size={15} /></Link>
            </div>
          </div>
          <Link href="/#about" className="nav-plain">About</Link>
        </nav>
        <div className="header-actions">
          <span className="network-indicator"><span className="live-dot" /> NEAR Mainnet</span>
          {accountId ? (
            <div className="wallet-menu-wrap">
              <button className="wallet-button connected" onClick={() => setAccountOpen(!accountOpen)} type="button"><span className="wallet-glow" /><Wallet size={16} /><span>{shortAddress(accountId)}</span><ChevronDown size={13} /></button>
              {accountOpen && <div className="wallet-dropdown"><span className="wallet-label">CONNECTED WALLET</span><span className="wallet-account">{accountId}</span><button type="button" onClick={() => { setAccountOpen(false); disconnect(); }}><LogOut size={15} /> Disconnect</button></div>}
            </div>
          ) : <button className="wallet-button" type="button" onClick={connect}><Wallet size={16} /><span>{ready ? "Connect Wallet" : "Loading wallet"}</span><ArrowUpRight size={14} /></button>}
          <button className="mobile-menu-button" type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
      </div>
      {mobileOpen && <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link onClick={close} href="/markets">Explore markets <ArrowRight size={18} /></Link>
        <Link onClick={close} href="/launch">Launch a coin <ArrowRight size={18} /></Link>
        <Link onClick={close} href="/fees">Fees & rewards <ArrowRight size={18} /></Link>
        <Link onClick={close} href="/#about">About <ArrowRight size={18} /></Link>
        {!accountId && <button type="button" onClick={() => { close(); connect(); }}>Connect Wallet <Wallet size={17} /></button>}
      </nav>}
    </header>
  );
}
