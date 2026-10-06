"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CircleAlert, CircleHelp, Coins, Flame, ImagePlus, Image as ImageIcon, Info, Link2, LoaderCircle, LockKeyhole, Rocket, Save, ShieldCheck, Sparkles, Trash2, Users, Wallet } from "lucide-react";
import { useWallet, useWatchlist } from "@/components/providers";
import { fromUnits, toUnits } from "@/lib/format";
import { processTokenImage, verifyImageUrl, type ProcessedImage } from "@/lib/image";
import type { LaunchCost } from "@/lib/types";

type FeeMode = "creator" | "holders" | "burn";
type QuoteResponse = LaunchCost & { maxIconBytes?: number; display: { launchFee: string; tokenStorage: string; poolCreate: string; dclStorage: string; devBuy: string; total: string } };

const feeDestinations = [
  { value: "creator", label: "Creator", detail: "Earn your share of pool fees", icon: Wallet },
  { value: "holders", label: "Holders", detail: "Reward your community", icon: Users },
  { value: "burn", label: "Buyback & burn", detail: "Reduce token supply over time", icon: Flame },
] as const;

function validUrl(value: string) { return !value.trim() || /^https:\/\/[^\s]+$/i.test(value.trim()); }

export function LaunchForm() {
  const { accountId, connect, sendTransaction } = useWallet();
  const { visitorId } = useWatchlist();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [feeMode, setFeeMode] = useState<FeeMode>("creator");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [buyTax, setBuyTax] = useState(1);
  const [sellTax, setSellTax] = useState(1);
  const [creatorSplit, setCreatorSplit] = useState(50);
  const [burnSplit, setBurnSplit] = useState(25);
  const [holdersSplit, setHoldersSplit] = useState(25);
  const [firstBuy, setFirstBuy] = useState("");
  const [cost, setCost] = useState<QuoteResponse | null>(null);
  const [costLoading, setCostLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [logoTab, setLogoTab] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [imageInfo, setImageInfo] = useState<ProcessedImage | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [maxIconBytes, setMaxIconBytes] = useState(16384);

  useEffect(() => {
    if (!visitorId) return;
    fetch(`/api/drafts?visitorId=${encodeURIComponent(visitorId)}`).then((res) => res.json()).then(({ draft }) => {
      if (!draft || typeof draft !== "object") return;
      if (typeof draft.name === "string") setName(draft.name);
      if (typeof draft.symbol === "string") setSymbol(draft.symbol);
      if (typeof draft.description === "string") setDescription(draft.description);
      if (typeof draft.logo === "string") {
        setLogo(draft.logo);
        if (draft.logo.startsWith("http")) setLogoTab("url");
        if (draft.logo.startsWith("data:")) setImageInfo({ dataUrl: draft.logo, chars: draft.logo.length, width: 0, height: 0, originalBytes: 0, originalWidth: 0, originalHeight: 0, format: draft.logo.slice(5, draft.logo.indexOf(";")), resized: false, animatedPreserved: true });
      }
      if (typeof draft.website === "string") setWebsite(draft.website);
      if (typeof draft.twitter === "string") setTwitter(draft.twitter);
      if (typeof draft.telegram === "string") setTelegram(draft.telegram);
      if (["creator", "holders", "burn"].includes(draft.feeMode)) setFeeMode(draft.feeMode);
      if (typeof draft.taxEnabled === "boolean") setTaxEnabled(draft.taxEnabled);
      if (typeof draft.buyTax === "number") setBuyTax(draft.buyTax);
      if (typeof draft.sellTax === "number") setSellTax(draft.sellTax);
      if (typeof draft.creatorSplit === "number") setCreatorSplit(draft.creatorSplit);
      if (typeof draft.burnSplit === "number") setBurnSplit(draft.burnSplit);
      if (typeof draft.holdersSplit === "number") setHoldersSplit(draft.holdersSplit);
      if (typeof draft.firstBuy === "string") setFirstBuy(draft.firstBuy);
    }).catch(() => {});
  }, [visitorId]);

  const taxed = taxEnabled && (buyTax > 0 || sellTax > 0);
  const getCost = useCallback(async (signal?: AbortSignal): Promise<QuoteResponse> => {
    const response = await fetch("/api/launch-quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ iconBytes: logo.length, firstBuy: firstBuy || "0", taxed }), signal, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load launch cost");
    return data;
  }, [logo, firstBuy, taxed]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setCostLoading(true);
      getCost(controller.signal).then((value) => { if (value.maxIconBytes) setMaxIconBytes(value.maxIconBytes); setCost(value); setCostLoading(false); }).catch((err) => { if (!controller.signal.aborted) { setCost(null); setCostLoading(false); setError(err instanceof Error ? err.message : "Fee quote unavailable"); } });
    }, 350);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [getCost]);

  const applyImage = (value: string, info: ProcessedImage | null) => {
    setLogo(value);
    setImageInfo(info);
    setImageError("");
    setError("");
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setImageBusy(true);
    setImageError("");
    try {
      const processed = await processTokenImage(file, maxIconBytes);
      applyImage(processed.dataUrl, processed);
      setLogoTab("upload");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Gambar tidak dapat diproses.");
    } finally {
      setImageBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => { await handleFile(event.target.files?.[0]); };

  const applyLogoUrl = async () => {
    const url = imageUrl.trim();
    setImageError("");
    if (!url) { setImageError("Tempel URL gambar terlebih dahulu."); return; }
    if (!/^https:\/\/\S+$/i.test(url)) { setImageError("URL harus dimulai dengan https://"); return; }
    if (url.length > maxIconBytes) { setImageError(`URL melebihi ${maxIconBytes} karakter.`); return; }
    setImageBusy(true);
    try {
      const size = await verifyImageUrl(url);
      applyImage(url, { dataUrl: url, chars: url.length, width: size.width, height: size.height, originalBytes: 0, originalWidth: size.width, originalHeight: size.height, format: "image/url", resized: false, animatedPreserved: true });
      setLogoTab("url");
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Gambar tidak dapat dimuat.");
    } finally { setImageBusy(false); }
  };

  const clearImage = () => { setLogo(""); setImageInfo(null); setImageUrl(""); setImageError(""); if (fileRef.current) fileRef.current.value = ""; };

  const saveDraft = async () => {
    if (!visitorId) { setNotice("Preparing your private draft. Try again shortly."); return; }
    try {
      const draft = { name, symbol, description, logo, website, twitter, telegram, feeMode, taxEnabled, buyTax, sellTax, creatorSplit, burnSplit, holdersSplit, firstBuy };
      const response = await fetch("/api/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitorId, draft }) });
      if (!response.ok) throw new Error("Could not save the draft.");
      setNotice("Draft saved. You can continue later in this browser.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Draft could not be saved."); }
  };

  const launch = async () => {
    setError(""); setNotice("");
    if (!accountId) { connect(); return; }
    if (!name.trim() || name.trim().length > 32) { setError("Token name must be between 1 and 32 characters."); return; }
    if (!/^[A-Za-z0-9]{1,12}$/.test(symbol)) { setError("Symbol must be 1–12 letters or numbers."); return; }
    if (description.length > 500) { setError("Description cannot exceed 500 characters."); return; }
    if (![website, twitter, telegram].every(validUrl)) { setError("Links must start with https://"); return; }
    if ([website, twitter, telegram].some((link) => link.length > 200)) { setError("Links cannot exceed 200 characters."); return; }
    if (![buyTax, sellTax].every((value) => Number.isFinite(value) && value >= 0 && value <= 4)) { setError("Buy and sell tax must be between 0% and 4%."); return; }
    if (taxed && creatorSplit + burnSplit + holdersSplit !== 100) { setError("Tax distribution must add up to 100%."); return; }
    if (taxed && [creatorSplit, burnSplit, holdersSplit].some((value) => !Number.isInteger(value) || value < 0 || value > 100)) { setError("Use whole percentages from 0 to 100 for the tax split."); return; }
    setBusy(true);
    try {
      const freshCost = await getCost();
      const devBuy = firstBuy && Number(firstBuy) > 0 ? toUnits(firstBuy, 24) : null;
      const args: Record<string, unknown> = {
        name: name.trim(), symbol: symbol.trim().toUpperCase(), description: description.trim() || null,
        icon: logo || null,
        links: { website: website.trim() || null, twitter: twitter.trim() || null, telegram: telegram.trim() || null },
        dev_buy: devBuy, quote: null, fee_mode: feeMode,
      };
      if (taxed) args.tax = { buy_bps: Math.round(buyTax * 100), sell_bps: Math.round(sellTax * 100), creator_bps: creatorSplit * 100, burn_bps: burnSplit * 100, holders_bps: holdersSplit * 100 };
      setNotice("Please review and approve the launch in your NEAR wallet.");
      const outcome = await sendTransaction({ receiverId: "nearlytrade.near", actions: [{ type: "FunctionCall", params: { methodName: "launch", args, gas: "300000000000000", deposit: freshCost.total } }] });
      const hash = (outcome as { transaction?: { hash?: string } } | undefined)?.transaction?.hash;
      if (hash) setTxHash(hash);
      setSubmitted(true);
      setNotice("Launch transaction submitted. Pool creation may take a few blocks. Check the transaction on NEAR Blocks.");
    } catch (err) { setError(err instanceof Error ? err.message : "Launch was not submitted."); setNotice(""); }
    finally { setBusy(false); }
  };

  const splitTotal = creatorSplit + burnSplit + holdersSplit;

  return <main className="inner-page launch-page"><div className="inner-page-aura"/><div className="content-width launch-content">
    <div className="breadcrumbs"><Link href="/"><ArrowLeft size={14}/> Home</Link><span>/</span><strong>Launchpad</strong></div>
    <div className="launch-heading"><div><span className="eyebrow"><span className="tiny-line"/> LAUNCH ON NEAR</span><h1>Your idea, meet<br/><span>the chain.</span></h1><p>Create a token, open a real Rhea market and make it yours. One transaction. Endless possibilities.</p></div><div className="launch-heading-badge"><span><Sparkles size={18}/></span><b>Launch your way</b><small>Made for creators. Powered by NEAR.</small></div></div>
    <div className="launch-layout"><div className="launch-form-column">
      <section className="form-card"><div className="form-card-heading"><span className="form-step">01</span><div><h2>The essentials</h2><p>Give your token an identity worth remembering.</p></div></div><div className="form-card-body">
        <div className="form-two-cols"><label className="form-field"><span>Token name <em>*</em></span><input maxLength={32} value={name} onChange={(e) => setName(e.target.value)} placeholder="TOKEN NAME"/><small>{name.length}/32 characters</small></label><label className="form-field"><span>Ticker symbol <em>*</em></span><div className="symbol-input"><span>$</span><input maxLength={12} value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="TICKER"/></div><small>Up to 12 letters or numbers</small></label></div>
        <label className="form-field"><span>Description <em className="optional">OPTIONAL</em></span><textarea maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell the world what makes your token different..." rows={4}/><small>{description.length}/500 characters</small></label>
        <div className="logo-field"><div className="field-title">Token image <em className="optional">OPTIONAL</em></div>
        <div className="logo-tabs"><button type="button" className={logoTab === "upload" ? "active" : ""} onClick={() => setLogoTab("upload")}><ImagePlus size={15}/> Upload file</button><button type="button" className={logoTab === "url" ? "active" : ""} onClick={() => setLogoTab("url")}><Link2 size={15}/> Image URL</button></div>
        {logoTab === "upload" ? <div className="logo-upload-row">
          <div className={`logo-dropzone ${dragOver ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(event) => { event.preventDefault(); setDragOver(false); handleFile(event.dataTransfer.files?.[0]); }} onClick={() => !imageBusy && fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileRef.current?.click(); }}>
            {imageBusy ? <LoaderCircle size={26} className="spin-icon"/> : logo ? <img src={logo} alt="Token logo preview"/> : <ImagePlus size={26}/>}
            <span>{imageBusy ? "Processing..." : logo ? "Change" : "Choose image"}</span>
          </div>
          <div className="logo-side">
            <strong>Any image works</strong>
            <p>PNG, JPG, WEBP or GIF. Big files are automatically resized and compressed to fit the onchain limit — nothing is uploaded to a server.</p>
            {imageInfo && logo && <div className="logo-meta"><span>{imageInfo.resized ? `Auto-resized ${imageInfo.originalWidth}×${imageInfo.originalHeight} → ${imageInfo.width}×${imageInfo.height}` : "Original kept as-is"}</span><span className="logo-meta-size">{(imageInfo.chars / 1024).toFixed(1)} KB / {(maxIconBytes / 1024).toFixed(0)} KB</span></div>}
            {imageInfo?.animatedPreserved && logo && <span className="logo-note-ok"><Check size={12}/> Animation preserved</span>}
            {logo && <button type="button" className="remove-logo" onClick={clearImage}><Trash2 size={13}/> Remove image</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadLogo}/>
        </div> : <div className="logo-url-row">
          <label className="form-field logo-url-field"><span>Direct image link</span><div className="symbol-input"><Link2 size={15}/><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyLogoUrl(); } }} placeholder="https://example.com/logo.png"/></div></label>
          <button type="button" className="logo-url-apply" onClick={applyLogoUrl} disabled={imageBusy}>{imageBusy ? <LoaderCircle size={16} className="spin-icon"/> : <Check size={16}/>} Use image</button>
        </div>}
        {logo && <div className="logo-preview-strip"><ImageIcon size={14}/><span>Image ready for onchain storage</span><img src={logo} alt="Token image preview"/></div>}
        {imageError && <div className="logo-error"><CircleAlert size={14}/>{imageError}</div>}
        <div className="form-hint"><Info size={15}/><span>The icon is stored on the token contract, so bigger images cost more storage. Currently {(maxIconBytes / 1024).toFixed(0)} KB is the onchain maximum — the quote on the right updates as your image changes.</span></div>
      </div>
      </div></section>
      <section className="form-card"><div className="form-card-heading"><span className="form-step">02</span><div><h2>Make it social</h2><p>Help your community find you. All links are optional.</p></div></div><div className="form-card-body form-socials"><label className="form-field"><span>Website</span><input type="url" maxLength={200} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourproject.com"/></label><div className="form-two-cols"><label className="form-field"><span>X / Twitter</span><input type="url" maxLength={200} value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/yourproject"/></label><label className="form-field"><span>Telegram</span><input type="url" maxLength={200} value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/yourproject"/></label></div></div></section>
      <section className="form-card"><div className="form-card-heading"><span className="form-step">03</span><div><h2>Choose where fees go</h2><p>You decide how your creator share works.</p></div></div><div className="form-card-body"><div className="fee-destination-grid">{feeDestinations.map((item) => <button type="button" key={item.value} className={`fee-destination ${feeMode === item.value ? "selected" : ""}`} onClick={() => setFeeMode(item.value)}><span className="destination-icon"><item.icon size={21}/></span><span className="destination-text"><strong>{item.label}</strong><small>{item.detail}</small></span><span className="destination-radio">{feeMode === item.value && <Check size={12}/>}</span></button>)}</div><div className="form-hint"><Info size={15}/><span>Creator destination receives 70% of the factory&apos;s collected LP fees. Protocol receives 20%, referral pot 10%. Rhea&apos;s share is separate. <Link href="/fees">See the fee breakdown <ArrowUpRight size={12}/></Link></span></div></div></section>
      <section className="form-card"><div className="form-card-heading"><span className="form-step">04</span><div><h2>Customize your launch</h2><p>Add an optional first buy or token tax.</p></div></div><div className="form-card-body"><label className="form-field"><span>First buy <em className="optional">OPTIONAL</em></span><div className="amount-with-suffix"><input inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.0"/><span>NEAR</span></div><small>Buy your token when the pool opens. The factory caps the first buy to 4% of supply.</small></label><div className="tax-toggle-row"><div><strong>Custom token tax</strong><span>Optional 0–4% on buys and sells. Separate from the 1% pool fee.</span></div><button type="button" role="switch" aria-checked={taxEnabled} className={`switch ${taxEnabled ? "on" : ""}`} onClick={() => setTaxEnabled(!taxEnabled)}><span/></button></div>
        {taxEnabled && <div className="tax-settings"><div className="form-two-cols"><label className="form-field"><span>Buy tax</span><div className="amount-with-suffix"><input type="number" min="0" max="4" step="0.5" value={buyTax} onChange={(e) => setBuyTax(Number(e.target.value))}/><span>%</span></div></label><label className="form-field"><span>Sell tax</span><div className="amount-with-suffix"><input type="number" min="0" max="4" step="0.5" value={sellTax} onChange={(e) => setSellTax(Number(e.target.value))}/><span>%</span></div></label></div><div className="tax-split-title"><span>Split the token tax</span><strong className={splitTotal === 100 ? "valid" : "invalid"}>{splitTotal}% / 100%</strong></div><div className="tax-split-bar"><span style={{ width: `${Math.max(0, creatorSplit)}%` }}/><span style={{ width: `${Math.max(0, burnSplit)}%` }}/><span style={{ width: `${Math.max(0, holdersSplit)}%` }}/></div><div className="tax-split-inputs"><label><span><i/> Creator</span><input type="number" min="0" max="100" value={creatorSplit} onChange={(e) => setCreatorSplit(Number(e.target.value))}/><em>%</em></label><label><span><i/> Burn</span><input type="number" min="0" max="100" value={burnSplit} onChange={(e) => setBurnSplit(Number(e.target.value))}/><em>%</em></label><label><span><i/> Holders</span><input type="number" min="0" max="100" value={holdersSplit} onChange={(e) => setHoldersSplit(Number(e.target.value))}/><em>%</em></label></div><p className="tax-footnote">Tax terms are set at launch and cannot be changed later. Make sure the split equals 100%.</p></div>}
      </div></section>
      <div className="launch-form-bottom"><button type="button" className="save-draft" onClick={saveDraft}><Save size={16}/> Save draft</button><span>Nothing goes onchain until you approve in your wallet.</span></div>
    </div>
    <aside className="launch-preview-column"><div className="launch-preview-sticky"><div className="preview-token-card"><div className="preview-top"><span>LIVE PREVIEW</span><span className="preview-live"><span className="live-dot"/> NEAR</span></div><div className="preview-coin-icon">{logo ? <img src={logo} alt="Token preview"/> : <span>{symbol.slice(0, 2) || "✳"}</span>}</div><h3>{name.trim() || "Your token name"}</h3><p>${symbol || "TICKER"} <span>·</span> NEAR</p><div className="preview-token-foot"><div><span>Total supply</span><b>1,000,000,000</b></div><div><span>Liquidity</span><b><LockKeyhole size={13}/> Permanently locked</b></div><div><span>Pool fee</span><b>1% · Rhea</b></div><div><span>Creator fee destination</span><b className="capitalize">{feeMode === "burn" ? "Buyback & burn" : feeMode}</b></div></div></div>
      <div className="launch-cost-card"><div className="cost-head"><span>COST TO LAUNCH</span><span className="cost-live"><span className="live-dot"/> LIVE QUOTE</span></div><div className="cost-lines"><div><span>Platform launch fee</span><strong className="cost-free">0 NEAR <Check size={13}/></strong></div><div><span>Token account & storage</span><strong>{cost ? cost.display.tokenStorage : costLoading ? "..." : "—"} NEAR</strong></div><div><span>Pool creation</span><strong>{cost ? cost.display.poolCreate : "—"} NEAR</strong></div><div><span>Pool & position storage</span><strong>{cost ? cost.display.dclStorage : "—"} NEAR</strong></div>{firstBuy && Number(firstBuy) > 0 && <div><span>Your first buy</span><strong>{cost ? cost.display.devBuy : firstBuy} NEAR</strong></div>}</div><div className="cost-total"><span>Estimated deposit</span><strong>{cost ? cost.display.total : costLoading ? "..." : "—"} <small>NEAR</small></strong></div><p>Exact amount comes from the Nearly factory. Network gas is additional and paid to NEAR.</p></div>
      {error && <div className="launch-message error"><CircleAlert size={17}/><span>{error}</span></div>}
      {notice && <div className={`launch-message ${submitted ? "success" : ""}`}>{submitted ? <Check size={17}/> : <Info size={17}/>}<span>{notice}{txHash && <a href={`https://nearblocks.io/txns/${txHash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={13}/></a>}</span></div>}
      <button type="button" className="launch-submit" disabled={busy || submitted || Boolean(accountId && (!cost || costLoading))} onClick={launch}>{busy ? <><LoaderCircle size={19} className="spin-icon"/> Confirm in wallet...</> : submitted ? <><Check size={19}/> Launch submitted</> : !accountId ? <><Wallet size={19}/> Connect Wallet to Launch <ArrowRight size={17}/></> : <><Rocket size={19}/> Launch your token <ArrowRight size={17}/></>}</button><div className="preview-assurance"><ShieldCheck size={15}/><span>One transaction. Fixed supply. Locked liquidity.</span></div>
      </div></aside>
    </div>
    <div className="launch-lower-note"><span><CircleHelp size={17}/> New to launching?</span><p>Your token goes live on Rhea after the factory creates the pool. It may take a few blocks to complete. Check the transaction and token details before trading.</p><Link href="/fees">Understand the fees <ArrowUpRight size={15}/></Link></div>
  </div></main>;
}
