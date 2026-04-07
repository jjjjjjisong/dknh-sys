param(
  [string]$BranchName
)

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $BranchName -or [string]::IsNullOrWhiteSpace($BranchName)) {
  $BranchName = git -C $repoRoot branch --show-current
}

$mainEnv = Join-Path $repoRoot ".env.main.local"
$devEnv = Join-Path $repoRoot ".env.dev.local"
$targetEnv = Join-Path $repoRoot ".env.local"

if ($BranchName -eq "main") {
  $sourceEnv = $mainEnv
  $label = "production"
} else {
  $sourceEnv = $devEnv
  $label = "development"
}

if (-not (Test-Path $sourceEnv)) {
  Write-Error "Missing $sourceEnv. Create the file first, then rerun this script."
  exit 1
}

Copy-Item -LiteralPath $sourceEnv -Destination $targetEnv -Force
Write-Host "Synced .env.local from $label settings for branch '$BranchName'."
