param(
  [string]$Reason = "scheduled"
)
$ErrorActionPreference = "Stop"
$appData = [Environment]::GetFolderPath('ApplicationData')
$documents = [Environment]::GetFolderPath('MyDocuments')
$data = Join-Path $appData 'Workshop Manager\Data\workshop.sqlite'
$backupDir = Join-Path $documents 'Workshop Manager Backups'
if (!(Test-Path $data)) { exit 0 }
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$dest = Join-Path $backupDir ("WorkshopManager_{0}_{1}.sqlite" -f $stamp,$Reason)
Copy-Item -LiteralPath $data -Destination $dest -Force
# Keep the newest 60 SQLite backups.
Get-ChildItem $backupDir -Filter '*.sqlite' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 60 | Remove-Item -Force -ErrorAction SilentlyContinue
