$ErrorActionPreference = "Stop"

$src = "c:\Users\1\soccer.co.ke"
$dst = Join-Path $src "tmp-hosting"
$zipPath = Join-Path $src "soccer-co-ke-hosting.zip"

if (Test-Path $dst) {
  Remove-Item $dst -Recurse -Force
}
New-Item -ItemType Directory -Path $dst | Out-Null

# Copy everything except heavy/runtime-only folders and secrets.
robocopy `
  $src $dst /MIR `
  /XD node_modules .next .git .cursor .vscode agent-transcripts terminals tmp-hosting `
  /XF *.zip *.tgz shopify-theme-upload.zip shopify-theme-*.zip OPEN_SITE.txt HOSTING.txt `
      .env.local .env yarn.lock tmp-create-hosting-zip.ps1 `
  | Out-Null

$code = $LASTEXITCODE
if ($code -ge 8) {
  throw "robocopy failed with exit code $code"
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $dst '*') -DestinationPath $zipPath -Force | Out-Null

Write-Output ("created " + $zipPath + " (" + (Get-Item $zipPath).Length + " bytes)")

Remove-Item $dst -Recurse -Force

