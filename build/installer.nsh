!macro customInstall
  DetailPrint "Installing Workshop Manager automatic backup tasks..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\install-backup-tasks.ps1" -AppDir "$INSTDIR\resources"'
!macroend

!macro customUnInstall
  DetailPrint "Removing Workshop Manager automatic backup tasks..."
  nsExec::ExecToLog 'schtasks.exe /Delete /TN "Workshop Manager Backup - Daily" /F'
  nsExec::ExecToLog 'schtasks.exe /Delete /TN "Workshop Manager Backup - Thursday" /F'
!macroend
