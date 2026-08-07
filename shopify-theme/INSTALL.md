# Install soccer.co.ke Live Hub in Your Shopify Theme

These files embed your live football site (World Cup, Premier League, news) **inside your Shopify store** — no DNS changes needed.

---

## What you get

| File | Purpose |
|------|---------|
| `sections/soccer-hub-iframe.liquid` | Full live scores embed (main file) |
| `sections/soccer-hub-banner.liquid` | Homepage banner → live scores page |
| `templates/page.soccer-hub.liquid` | Page template for a dedicated scores page |

---

## Step 1 — Upload files to your theme

1. Log in to **Shopify Admin**
2. Go to **Online Store → Themes**
3. Click **⋯** on your current theme → **Edit code**
4. Upload each file to the matching folder:

| Upload this file | Into this folder in theme editor |
|------------------|----------------------------------|
| `sections/soccer-hub-iframe.liquid` | **Sections** → Add a new section → paste code |
| `sections/soccer-hub-banner.liquid` | **Sections** → Add a new section → paste code |
| `templates/page.soccer-hub.liquid` | **Templates** → Add a new template → paste code |

**How to add a section file:**
- Left sidebar → **Sections** → **Add a new section**
- Name it exactly: `soccer-hub-iframe` (must match filename without `.liquid`)
- Paste the full contents of the file → **Save**

**How to add the page template:**
- Left sidebar → **Templates** → **Add a new template**
- Choose type: **page**
- Name: `soccer-hub`
- Paste contents of `page.soccer-hub.liquid` → **Save**

---

## Step 2 — Create a Live Scores page

1. Go to **Online Store → Pages**
2. Click **Add page**
3. Title: `Live Scores` (or `World Cup`)
4. On the right, under **Theme template**, select **`soccer-hub`**
5. **Save**

Your live hub is now at: `https://www.soccer.co.ke/pages/live-scores`  
(URL depends on your page handle)

---

## Step 3 — Add to your menu

1. **Online Store → Navigation → Main menu**
2. **Add menu item**
   - Name: `⚽ Live Scores`
   - Link: your new page (Live Scores)
3. **Save**

---

## Step 4 (optional) — Homepage banner

1. **Online Store → Themes → Customize**
2. On the homepage, click **Add section**
3. Choose **Soccer Hub Banner**
4. Select your Live Scores page in settings
5. **Save**

---

## Settings you can change

In the theme customizer, open the **Soccer Hub** section:

| Setting | Default | Description |
|---------|---------|-------------|
| Hub URL | `https://soccer.co.ke` | Your live football site |
| Page path | `/` | Start page (`/world-cup`, `/news`, etc.) |
| Iframe height | 2400px | Make taller if content is cut off |

---

## Troubleshooting

**Blank iframe?**
- Open https://soccer.co.ke in a new tab — if it works, wait 1 minute and refresh the Shopify page
- Increase iframe height in section settings

**Page template not showing?**
- Template file must be named `page.soccer-hub.liquid` exactly
- Refresh the Pages admin after saving the template

**Need help?**
- Live site: https://soccer.co.ke
- Shop stays on Shopify — scores page is embedded from soccer.co.ke
