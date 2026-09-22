param([string]$AppDir = $PSScriptRoot)
$script = Join-Path $AppDir 'backup.ps1'
$taskBase = 'Workshop Manager Backup'
$daily = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -Reason daily"
$weekly = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`" -Reason weekly-thursday"
# Daily at 23:55 and an extra Thursday at 17:00.
schtasks.exe /Create /TN "$taskBase - Daily" /TR $daily /SC DAILY /ST 23:55 /F | Out-Null
schtasks.exe /Create /TN "$taskBase - Thursday" /TR $weekly /SC WEEKLY /D THU /ST 17:00 /F | Out-Null
Write-Host 'Backup tasks installed.'
