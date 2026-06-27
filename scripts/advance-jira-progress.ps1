param(
  [ValidateSet("Day1","Day2","Day3","Day4")]
  [string]$Day,
  [string]$BaseUrl = $env:JIRA_BASE_URL,
  [string]$Email = $env:JIRA_EMAIL,
  [string]$ApiToken = $env:JIRA_API_TOKEN,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BaseUrl) -or [string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($ApiToken)) {
  throw "Missing Jira credentials. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN."
}

$BaseUrl = $BaseUrl.TrimEnd("/")
$authBytes = [Text.Encoding]::ASCII.GetBytes("${Email}:${ApiToken}")
$headers = @{
  Authorization = "Basic " + [Convert]::ToBase64String($authBytes)
  Accept = "application/json"
  "Content-Type" = "application/json"
}

function Invoke-Jira {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
  } else {
    $json = $Body | ConvertTo-Json -Depth 10 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bytes
  }
}

function Move-Issue {
  param([string]$Key, [string]$TargetStatus)

  $issue = Invoke-Jira "GET" "/rest/api/3/issue/${Key}?fields=status"
  if ($issue.fields.status.name -eq $TargetStatus) {
    Write-Host "$Key already $TargetStatus"
    return
  }

  $transitions = Invoke-Jira "GET" "/rest/api/3/issue/$Key/transitions"
  $transition = $transitions.transitions | Where-Object { $_.to.name -eq $TargetStatus } | Select-Object -First 1
  if (-not $transition) {
    Write-Host "No direct transition for $Key from $($issue.fields.status.name) to $TargetStatus"
    return
  }

  if (-not $Apply) {
    Write-Host "[DRY] ${Key}: $($issue.fields.status.name) -> $TargetStatus"
    return
  }

  Invoke-Jira "POST" "/rest/api/3/issue/$Key/transitions" @{ transition = @{ id = $transition.id } } | Out-Null
  Write-Host "${Key}: $($issue.fields.status.name) -> $TargetStatus"
}

$plan = @{
  Day1 = @(
    @{ Key = "WS-32"; Status = "Done" },
    @{ Key = "WS-35"; Status = "Done" },
    @{ Key = "WS-33"; Status = "In Progress" },
    @{ Key = "WS-36"; Status = "In Progress" }
  )
  Day2 = @(
    @{ Key = "WS-33"; Status = "Done" },
    @{ Key = "WS-34"; Status = "In Progress" },
    @{ Key = "WS-37"; Status = "In Progress" }
  )
  Day3 = @(
    @{ Key = "WS-36"; Status = "Done" },
    @{ Key = "WS-34"; Status = "Done" },
    @{ Key = "WS-30"; Status = "In Progress" }
  )
  Day4 = @(
    @{ Key = "WS-37"; Status = "Done" },
    @{ Key = "WS-30"; Status = "Done" }
  )
}

foreach ($step in $plan[$Day]) {
  Move-Issue -Key $step.Key -TargetStatus $step.Status
}

if (-not $Apply) {
  Write-Host "Dry run only. Re-run with -Apply to make changes."
}
