# Registers the daily GitNewStars curation crawler as a Windows Scheduled Task.
# Run once (normal user is fine): powershell -ExecutionPolicy Bypass -File scripts\register-crawl-task.ps1
# Fires daily at 08:03 local time while this user is logged on.

$taskName = "GitNewStars Daily Crawl"
$bash     = "C:\Program Files\Git\bin\bash.exe"
$script   = "/c/Users/amaze luke/Documents/GitNewStars/scripts/daily-crawl.sh"

# bash -lc "'/path with spaces/daily-crawl.sh'"  (single-quote the path for the space)
$argument = "-lc `"'$script'`""

$action  = New-ScheduledTaskAction -Execute $bash -Argument $argument
$trigger = New-ScheduledTaskTrigger -Daily -At 8:03am
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Daily AI usecases/tips crawl -> data/curated-posts.json, commit & push (yjsplay2002)." `
  -Force

Write-Host "Registered '$taskName' (daily 08:03). Run now with:"
Write-Host "  Start-ScheduledTask -TaskName '$taskName'"
