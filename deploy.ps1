# Publish this folder to zcsmartdigital.com.
# The site is served by two Cloudflare workers that both get the full set of files:
#   blue-hill-dc43     home page (/) and /demos/*
#   yellow-smoke-77ca  everything else (styles, scripts, service pages, privacy, 404)
# Usage:  .\deploy.ps1            publish
#         .\deploy.ps1 -DryRun    build and check without uploading
param([switch]$DryRun)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. Copy only the website files into a clean folder (.wrangler\site), so git data,
#    deploy settings and notes are never uploaded. Uses git's list of project files,
#    which includes new files you haven't committed yet but skips anything in .gitignore.
$skip = '^(deploy/|deploy\.ps1$|README\.md$|\.gitignore$)'
$files = git ls-files --cached --others --exclude-standard | Where-Object { $_ -notmatch $skip -and (Test-Path -LiteralPath $_ -PathType Leaf) }
if (-not $files) { throw "No site files found. Run this from the project folder." }
$out = Join-Path $PSScriptRoot ".wrangler\site"
if (Test-Path $out) { Remove-Item $out -Recurse -Force -Confirm:$false }
foreach ($f in $files) {
    $dest = Join-Path $out $f
    New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
    Copy-Item -LiteralPath $f -Destination $dest
}
$html = Get-ChildItem $out -Recurse -Filter *.html | Select-String -Pattern "static.cloudflareinsights.com/beacon" -List
if ($html) { Write-Warning "These pages contain the Cloudflare analytics script, which Cloudflare already adds itself: $($html.Path -join ', ')" }
Write-Host "Prepared $($files.Count) files in .wrangler\site" -ForegroundColor Cyan

# 2. Upload to both workers.
$message = (git log -1 --pretty=%s) 2>$null
if (-not $message) { $message = "Site update" }
foreach ($worker in @("blue-hill-dc43", "yellow-smoke-77ca")) {
    Write-Host "`n=== $worker ===" -ForegroundColor Cyan
    $wranglerArgs = @("--yes", "wrangler@4", "deploy", "--config", "deploy/$worker.jsonc", "--message", $message)
    if ($DryRun) { $wranglerArgs += "--dry-run" }
    npx @wranglerArgs
    if ($LASTEXITCODE -ne 0) { throw "Deploy of $worker failed (exit $LASTEXITCODE)." }
}
if ($DryRun) { Write-Host "`nDry run only: nothing was uploaded." -ForegroundColor Yellow }
else { Write-Host "`nDone. Check https://zcsmartdigital.com/ (press Ctrl+F5 to skip the browser cache)." -ForegroundColor Green }
