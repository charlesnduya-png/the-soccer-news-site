$ErrorActionPreference = "Stop"

$src = "c:\Users\1\soccer.co.ke"
$folderName = "soccer-co-ke"
$stageRoot = Join-Path $src "tmp-hosting"
$stage = Join-Path $stageRoot $folderName
$downloads = "c:\Users\1\Downloads"
$zipPath = Join-Path $downloads "soccer-co-ke.zip"
$zipDated = Join-Path $downloads ("soccer-co-ke-hosting-" + (Get-Date -Format "yyyy-MM-dd-HHmm") + ".zip")

if (Test-Path $stageRoot) {
  Remove-Item $stageRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $stage | Out-Null

robocopy `
  $src $stage /E /NFL /NDL /NJH /NJS /nc /ns /np `
  /XD node_modules .next .git .cursor .vscode .vercel agent-transcripts terminals tmp-hosting shopify-theme soccer-co-ke-theme `
  /XF *.zip *.tgz OPEN_SITE.txt tmp-create-hosting-zip.ps1 .env.local .env yarn.lock CLAUDE.md AGENTS.md |
  Out-Null

$code = $LASTEXITCODE
if ($code -ge 8) {
  throw "robocopy failed with exit code $code"
}

$themeDest = Join-Path $stage "shopify-theme-pack"
New-Item -ItemType Directory -Path $themeDest | Out-Null
robocopy (Join-Path $src "soccer-co-ke-theme") $themeDest /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { throw "theme robocopy failed" }

$builtAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$newsApi = Get-Content (Join-Path $stage "src\lib\news-api.ts") -Raw
$janta = Get-Content (Join-Path $stage "src\components\janta-advert.tsx") -Raw
$imgComp = Get-Content (Join-Path $stage "src\components\news-article-image.tsx") -Raw
$layout = Get-Content (Join-Path $stage "src\app\layout.tsx") -Raw
$footballApi = Get-Content (Join-Path $stage "src\lib\football-api.ts") -Raw
$fotmob = Get-Content (Join-Path $stage "src\lib\premier-league-fotmob.ts") -Raw
$newsFeed = Get-Content (Join-Path $stage "src\components\news-feed.tsx") -Raw
$hasZoomLock = Test-Path (Join-Path $stage "src\components\mobile-zoom-lock.tsx")
$hasViewport = $layout -match "userScalable:\s*false"
$hasMobileLockImport = $layout -match "MobileZoomLock"
$hasPlStandingsFotmob = $fotmob -match "getPremierLeagueStandingsFromFotMob"
$hasPlStandingsFallback = $footballApi -match "getPremierLeagueStandingsFromFotMob"
$hasNewsBannerFix = ($newsApi -match "do not mark healthy cache as degraded") -or ($newsFeed -notmatch "latest verified stories")

$hasNewsFix = $newsApi -match "createHash"
$hasSWR = $newsApi -match "Stale-while-revalidate"
$hasWhatsApp = $janta -match "chat.whatsapp.com"
$hasPilot = $janta -match "pilot-ke-aviator"
$hasTop = $janta -match "janta-top-pool"
$hasDirectImg = $imgComp -match "Prefer direct publisher URL"

$bannersOk = $true
foreach ($b in @(
  "janta-freebet.png",
  "pilot-ke-aviator.png",
  "janta-top-pool.png",
  "janta-whatsapp-lottery.png",
  "janta-play-win.png"
)) {
  if (-not (Test-Path (Join-Path $stage "public\banners\$b"))) {
    $bannersOk = $false
  }
}

$version = @"
soccer.co.ke - HOSTING READY PACKAGE
====================================
Built: $builtAt
Build tag: PL-TABLE-NEWS-v3

This build is tuned for VPS / cPanel Node / Cloudflare:
- Live 2026/27 Premier League table via FotMob (auto-updates)
- MobileZoomLock blocks iPhone pinch/double-tap zoom
- Viewport locked (userScalable false)
- News false-alarm banner fixed (only warns on real backup mode)
- News API stale-while-revalidate (fewer HTTP 522 timeouts)
- News images load directly in browser first
- Advert banners + Join WhatsApp group + side arrows
- Deploy check: node scripts/check-deploy.js

Checks:
  news IDs=$hasNewsFix
  news SWR=$hasSWR
  news banner fix=$hasNewsBannerFix
  PL FotMob standings=$hasPlStandingsFotmob
  PL standings wired=$hasPlStandingsFallback
  whatsapp=$hasWhatsApp
  pilot=$hasPilot
  janta.top=$hasTop
  direct images=$hasDirectImg
  banners=$bannersOk
  mobile zoom lock=$hasZoomLock
  viewport lock=$hasViewport
  layout imports lock=$hasMobileLockImport

IMPORTANT AFTER UNZIP
  You MUST run: npm install && npm run build && npm start
  Uploading files alone will keep the OLD site behavior.

DEPLOY
  1. Unzip -> open soccer-co-ke
  2. node scripts/check-deploy.js
  3. npm install
  4. copy .env.example to .env.local (set NEXT_PUBLIC_SITE_URL)
  5. npm run build
  6. npm start
  7. On phone: clear site data / hard refresh

Read HOSTING.txt for Cloudflare 522 fixes.
Live demo: https://soccercoke-alpha.vercel.app
"@

Set-Content -Path (Join-Path $stage "VERSION.txt") -Value $version -Encoding UTF8
Set-Content -Path (Join-Path $stage "READ-FIRST.txt") -Value "1) Read HOSTING.txt  2) node scripts/check-deploy.js  3) npm install && npm run build && npm start" -Encoding UTF8

foreach ($old in @($zipPath, $zipDated)) {
  if (Test-Path $old) { Remove-Item $old -Force }
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $stageRoot,
  $zipPath,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)
Copy-Item $zipPath $zipDated -Force

$news = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$entry = $news.Entries | Where-Object { $_.FullName -like "*src\lib\news-api.ts" } | Select-Object -First 1
$reader = New-Object System.IO.StreamReader($entry.Open())
$first = $reader.ReadLine()
$reader.Close()
$count = $news.Entries.Count
$news.Dispose()

Remove-Item $stageRoot -Recurse -Force

if (-not ($hasNewsFix -and $hasSWR -and $hasWhatsApp -and $hasPilot -and $hasTop -and $hasDirectImg -and $bannersOk -and $hasZoomLock -and $hasViewport -and $hasMobileLockImport)) {
  throw "ZIP missing required hosting-ready markers"
}

$item = Get-Item $zipPath
Write-Output "OK $($item.FullName)"
Write-Output "COPY $zipDated"
Write-Output "bytes $($item.Length)"
Write-Output "files $count"
Write-Output "news-api: $first"
