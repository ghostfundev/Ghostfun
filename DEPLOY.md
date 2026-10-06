# Deploy GHOSTFUN ke Cloudflare + konek GitHub

Semua konfigurasi sudah ada di repo ini dan **sudah diuji sampai `wrangler deploy --dry-run` lulus**
(bundle 1.8 MB gzip). Tinggal ikuti langkahnya.

| File | Fungsi |
|---|---|
| `wrangler.jsonc` | Konfigurasi Worker (nama, flags, assets) |
| `open-next.config.ts` | Konfigurasi adapter OpenNext |
| `next.config.ts` | Fix tracing `pg-cloudflare` (wajib, lihat catatan di bawah) |
| `.github/workflows/deploy.yml` | Auto-deploy tiap push ke `main` |
| `drizzle.config.prod.ts` | Push skema ke database produksi |
| `.gitignore` | Melindungi `.env`, `.dev.vars`, `.open-next` |

---

## ⚠️ Langkah 0 — Database dulu (WAJIB)

Cloudflare Workers **tidak bisa** mengakses PostgreSQL di `127.0.0.1` seperti di sandbox ini.
Kamu butuh Postgres terkelola yang bisa diakses dari internet. Gratis:

- **Neon** → https://neon.tech (rekomendasi, paling cocok untuk Workers)
- **Supabase** → https://supabase.com

Ambil connection string-nya, bentuknya seperti:

```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

Lalu buat tabelnya (`watchlist_items` + `launch_drafts`):

```bash
DATABASE_URL="postgresql://..." npx drizzle-kit push --config=drizzle.config.prod.ts
```

---

## Cara A — Deploy cepat dari laptop (5 menit)

```bash
# 1. Login ke Cloudflare (browser akan terbuka)
npx wrangler login

# 2. Simpan connection string sebagai secret (JANGAN taruh di wrangler.jsonc)
npx wrangler secret put DATABASE_URL
#    tempel connection string Neon/Supabase saat diminta

# 3. Build + deploy
npx opennextjs-cloudflare build && npx wrangler deploy
```

Selesai. URL-nya keluar seperti `https://ghostfun.<akun-kamu>.workers.dev`.

Mau cek dulu secara lokal pakai runtime Workers sungguhan sebelum deploy:

```bash
cp .dev.vars.example .dev.vars   # isi DATABASE_URL di dalamnya
npx opennextjs-cloudflare build && npx opennextjs-cloudflare preview
```

---

## Cara B — Konek GitHub (auto-deploy tiap push)

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "GHOSTFUN: NEAR trading & launchpad"
git branch -M main
git remote add origin https://github.com/USERNAME/ghostfun.git
git push -u origin main
```

> `.gitignore` sudah melindungi `.env`, `.dev.vars`, `node_modules`, dan `.open-next`.
> **Pastikan `.env` tidak ikut ter-commit** — cek dengan `git status` sebelum commit.

### 2. Pilih salah satu metode CI

#### Opsi B1 — Cloudflare Workers Builds (paling simpel, tanpa secret GitHub)

1. Buka **Cloudflare Dashboard → Workers & Pages → Create → Workers**
2. Pilih **Import a repository**, hubungkan akun GitHub, pilih repo-mu
3. Isi build settings:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
   - **Build output directory:** *(kosongkan)*
4. **Settings → Variables and Secrets** → tambah secret `DATABASE_URL`
5. Save & Deploy

Setiap `git push` ke `main` akan otomatis build + deploy. Pull request dapat preview URL sendiri.

#### Opsi B2 — GitHub Actions (workflow sudah disiapkan)

File `.github/workflows/deploy.yml` sudah ada. Tinggal tambahkan 2 secret di
**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Cara dapat |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create → template **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → sidebar kanan |

Lalu tetap jalankan sekali: `npx wrangler secret put DATABASE_URL`
(secret runtime disimpan di Cloudflare, bukan di GitHub).

Workflow-nya: setiap PR → typecheck + build; push ke `main` → deploy.

---

## Custom domain

**Workers & Pages → ghostfun → Settings → Domains & Routes → Add → Custom Domain**.
Kalau domainnya sudah di Cloudflare, DNS dan SSL dibuat otomatis.

---

## Opsional — Hyperdrive (Postgres lebih kencang)

Hyperdrive menyatukan connection pool di edge (query cache sub-5 ms).

```bash
npx wrangler hyperdrive create ghostfun-db --connection-string="postgresql://..."
```

1. Uncomment blok `hyperdrive` di `wrangler.jsonc`, isi `id` dari output di atas.
2. Di `src/db/index.ts`, ganti isi fungsi `connectionString()` menjadi:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

function connectionString(): string {
  try {
    const hyperdrive = getCloudflareContext().env.HYPERDRIVE;
    if (hyperdrive?.connectionString) return hyperdrive.connectionString;
  } catch {
    // bukan di Workers — pakai DATABASE_URL
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  return url;
}
```

> Migrasi (`drizzle-kit push`) tetap pakai connection string langsung, bukan Hyperdrive.

---

## Catatan penting (hasil uji nyata di repo ini)

1. **Next.js harus ≥ 16.3.8.** OpenNext secara eksplisit menolak 16.0–16.3.7
   (`peer next@">=15.5.27 <16 || >=16.3.8"`). Repo ini sudah dinaikkan ke **16.3.8**.

2. **Fix `pg-cloudflare` wajib ada.** Tanpa `outputFileTracingIncludes` di `next.config.ts`,
   build gagal dengan `Could not resolve "pg-cloudflare"` — karena `pg` me-require-nya di balik
   runtime check sehingga file tracer Next tidak melihatnya.
   Ini bug upstream [opennextjs-cloudflare#1214](https://github.com/opennextjs/opennextjs-cloudflare/issues/1214),
   dan perbaikannya sudah diterapkan di repo ini.

3. **Jangan pakai `export const runtime = "edge"`.** Tidak didukung adapter. Repo ini tidak memakainya.

4. **Jangan taruh `DATABASE_URL` di `wrangler.jsonc`** — isi file itu ikut ter-commit.
   Selalu pakai `wrangler secret put`.

5. Batas ukuran Worker: **3 MB gzip (free)** / 10 MB (paid). Bundle saat ini **1.8 MB gzip** — aman.
   File di `public/` dihitung sebagai static assets, tidak masuk batas ini.

---

## Troubleshooting

| Gejala | Penyebab & solusi |
|---|---|
| `ERESOLVE ... peer next` | Next < 16.3.8. Jalankan `npm i next@16.3.8 eslint-config-next@16.3.8` |
| `Could not resolve "pg-cloudflare"` | `outputFileTracingIncludes` hilang dari `next.config.ts` |
| 500 di `*.workers.dev` | Binding `WORKER_SELF_REFERENCE` tidak cocok dengan `name` di `wrangler.jsonc` |
| `DATABASE_URL is not set` | Secret belum dipasang: `npx wrangler secret put DATABASE_URL` |
| DB timeout / `ECONNREFUSED` | Masih menunjuk `127.0.0.1`. Harus pakai Postgres terkelola (Neon/Supabase) |
| Tabel tidak ada | Belum push skema: `DATABASE_URL="..." npx drizzle-kit push --config=drizzle.config.prod.ts` |

---

## Perintah cepat

```bash
npx opennextjs-cloudflare build                      # build bundle Worker
npx opennextjs-cloudflare preview                    # jalankan di runtime Workers lokal
npx wrangler deploy                                  # deploy ke produksi
npx wrangler deploy --dry-run                        # cek tanpa upload
npx wrangler secret put DATABASE_URL                 # simpan secret
npx wrangler tail                                    # lihat log produksi real-time
npx wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts   # generate tipe binding
```
