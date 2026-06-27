param(
  [string]$BaseUrl = $env:JIRA_BASE_URL,
  [string]$Email = $env:JIRA_EMAIL,
  [string]$ApiToken = $env:JIRA_API_TOKEN,
  [string]$ProjectKey = $env:JIRA_PROJECT_KEY,
  [switch]$Apply,
  [string]$OutputDir = ".\jira-audit-output"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BaseUrl) -or [string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($ApiToken) -or [string]::IsNullOrWhiteSpace($ProjectKey)) {
  throw "Missing Jira credentials. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY."
}

$BaseUrl = $BaseUrl.TrimEnd("/")
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

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
    $json = $Body | ConvertTo-Json -Depth 20 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($json)
    Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json; charset=utf-8" -Body $bytes
  }
}

function Get-Issue {
  param([string]$Key, [string[]]$Fields)

  $fieldText = [uri]::EscapeDataString(($Fields -join ","))
  Invoke-Jira "GET" "/rest/api/3/issue/${Key}?fields=$fieldText"
}

function Get-KnownIssues {
  param([string[]]$Keys, [string[]]$Fields)

  $items = @()
  foreach ($key in $Keys) {
    try {
      $items += Get-Issue $key $Fields
    } catch {
      Write-Host "Skip missing or inaccessible issue $key"
    }
  }
  $items
}

function Get-FieldId {
  param([object[]]$Fields, [string[]]$Names)

  foreach ($name in $Names) {
    $match = $Fields | Where-Object { $_.name -eq $name } | Select-Object -First 1
    if ($match) { return $match.id }
  }
  foreach ($name in $Names) {
    $match = $Fields | Where-Object { $_.name -like "*$name*" } | Select-Object -First 1
    if ($match) { return $match.id }
  }
  $null
}

function New-AdfText {
  param([string]$Text)

  $paragraphs = @()
  foreach ($block in ($Text -split "(`r`n){2,}|`n{2,}")) {
    if ([string]::IsNullOrWhiteSpace($block)) { continue }
    $lines = $block -split "`r?`n"
    $content = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
      if ($i -gt 0) {
        $content += @{ type = "hardBreak" }
      }
      $content += @{ type = "text"; text = $lines[$i] }
    }
    $paragraphs += @{ type = "paragraph"; content = $content }
  }
  @{
    type = "doc"
    version = 1
    content = $paragraphs
  }
}

function Get-AdfPlainText {
  param([object]$Node)

  if ($null -eq $Node) { return "" }
  $parts = New-Object System.Collections.Generic.List[string]
  function Walk($n) {
    if ($null -eq $n) { return }
    if ($n.PSObject.Properties.Name -contains "text" -and $n.text) {
      $parts.Add([string]$n.text) | Out-Null
    }
    if ($n.PSObject.Properties.Name -contains "content" -and $n.content) {
      foreach ($child in $n.content) { Walk $child }
    }
  }
  Walk $Node
  $parts -join "`n"
}

function Update-IssueFields {
  param([string]$Key, [hashtable]$Fields)

  if (-not $Apply) {
    Write-Host "[DRY] Update $Key fields: $($Fields.Keys -join ', ')"
    return
  }
  Invoke-Jira "PUT" "/rest/api/3/issue/$Key" @{ fields = $Fields } | Out-Null
  Write-Host "Updated $Key"
}

function Create-Subtask {
  param(
    [string]$ParentKey,
    [string]$Summary,
    [string]$AssigneeAccountId,
    [string]$IssueTypeId
  )

  if (-not $Apply) {
    Write-Host "[DRY] Create subtask under ${ParentKey}: $Summary"
    return
  }

  $fields = @{
    project = @{ key = $ProjectKey }
    parent = @{ key = $ParentKey }
    issuetype = @{ id = $IssueTypeId }
    summary = $Summary
  }
  if (-not [string]::IsNullOrWhiteSpace($AssigneeAccountId)) {
    $fields.assignee = @{ accountId = $AssigneeAccountId }
  }

  $created = Invoke-Jira "POST" "/rest/api/3/issue" @{ fields = $fields }
  Write-Host "Created $($created.key) under $ParentKey"
}

function Set-Transition {
  param([string]$Key, [string]$TargetStatus)

  $transitions = Invoke-Jira "GET" "/rest/api/3/issue/$Key/transitions"
  $transition = $transitions.transitions | Where-Object { $_.to.name -eq $TargetStatus } | Select-Object -First 1
  if (-not $transition) {
    Write-Host "No direct transition for $Key to $TargetStatus"
    return
  }
  if (-not $Apply) {
    Write-Host "[DRY] Transition $Key to $TargetStatus"
    return
  }
  Invoke-Jira "POST" "/rest/api/3/issue/$Key/transitions" @{ transition = @{ id = $transition.id } } | Out-Null
  Write-Host "Transitioned $Key to $TargetStatus"
}

$me = Invoke-Jira "GET" "/rest/api/3/myself"
Write-Host "Connected to Jira as $($me.displayName)"

$fieldsResponse = Invoke-Jira "GET" "/rest/api/3/field"
$fields = @()
foreach ($field in $fieldsResponse) {
  $fields += $field
}
if ($fields.Count -eq 1 -and $fields[0] -is [array]) {
  $flattenedFields = @()
  foreach ($field in $fields[0]) {
    $flattenedFields += $field
  }
  $fields = $flattenedFields
}
$storyPointField = ($fields | Where-Object { $_.name -eq "Story point estimate" } | Select-Object -First 1).id
if (-not $storyPointField) {
  $storyPointField = ($fields | Where-Object { $_.name -like "*Story point*" -or $_.name -like "*Story Point*" } | Select-Object -First 1).id
}
if (-not $storyPointField) {
  throw "Could not find Story Point field."
}
Write-Host "Story point field: $storyPointField"

$project = Invoke-Jira "GET" "/rest/api/3/project/$ProjectKey"
$subtaskType = $project.issueTypes | Where-Object { $_.subtask -eq $true } | Select-Object -First 1
if (-not $subtaskType) {
  throw "Could not find subtask issue type in project $ProjectKey."
}
Write-Host "Subtask issue type: $($subtaskType.name) ($($subtaskType.id))"

$targetKeys = @("WS-1","WS-3","WS-5","WS-12","WS-13","WS-16","WS-17","WS-24","WS-25","WS-26","WS-27","WS-28","WS-29","WS-30","WS-31")
$issueFields = @("summary","issuetype","status","priority","assignee","description","parent","subtasks",$storyPointField)
$issues = @(Get-KnownIssues -Keys $targetKeys -Fields $issueFields)
$issuesPath = Join-Path $OutputDir "jira-live-before.json"
($issues | ConvertTo-Json -Depth 20) | Set-Content -LiteralPath $issuesPath -Encoding UTF8

$byKey = @{}
foreach ($issue in $issues) {
  $byKey[$issue.key] = $issue
}

$storyFixes = @{
  "WS-30" = @{
    StoryPoint = 8
    Description = @"
La nguoi quan ly nhom, toi muon xem bao cao chi tieu theo thang de nam duoc xu huong chi tieu cua nhom.

Acceptance Criteria 1:
Given nguoi dung da dang nhap va co du lieu chi tieu trong thang
When nguoi dung chon thang can xem bao cao
Then he thong hien thi tong chi, danh sach khoan chi va bieu do thong ke cua thang do

Acceptance Criteria 2:
Given nguoi dung chon mot thang khong co du lieu chi tieu
When nguoi dung mo bao cao thang do
Then he thong hien thi trang thai khong co du lieu va khong bi loi
"@
  }
  "WS-31" = @{
    StoryPoint = 5
    Description = @"
La thanh vien nhom, toi muon xem so du cong no de biet minh can tra hoac duoc nhan bao nhieu tien.

Acceptance Criteria 1:
Given nguoi dung da tham gia mot nhom co cac khoan chi chung
When nguoi dung mo man hinh cong no
Then he thong hien thi so tien can tra hoac duoc nhan cua tung thanh vien

Acceptance Criteria 2:
Given nguoi dung dang xem cong no cua nhom
When cac khoan chi duoc cap nhat
Then he thong tinh lai so du cong no va hien thi ket qua moi
"@
  }
}

foreach ($key in $storyFixes.Keys) {
  if (-not $byKey.ContainsKey($key)) {
    Write-Host "Skip missing issue $key"
    continue
  }
  $issue = $byKey[$key]
  $plainDescription = Get-AdfPlainText $issue.fields.description
  $fieldsToUpdate = @{}

  if ([string]::IsNullOrWhiteSpace([string]$issue.fields.$storyPointField)) {
    $fieldsToUpdate[$storyPointField] = $storyFixes[$key].StoryPoint
  }
  if ($plainDescription -notmatch "Acceptance Criteria" -or $plainDescription -notmatch "Given" -or $plainDescription -notmatch "When" -or $plainDescription -notmatch "Then") {
    $fieldsToUpdate["description"] = New-AdfText $storyFixes[$key].Description
  }
  if ($fieldsToUpdate.Count -gt 0) {
    Update-IssueFields $key $fieldsToUpdate
  } else {
    Write-Host "$key already has story point and GWT AC"
  }
}

$issues = @(Get-KnownIssues -Keys $targetKeys -Fields $issueFields)
$byKey = @{}
foreach ($issue in $issues) {
  $byKey[$issue.key] = $issue
}

$sprintStoryKeys = @("WS-1","WS-3","WS-5","WS-30","WS-31")
$subtaskTemplates = @(
  "Thiet ke giao dien va luong xu ly",
  "Lap trinh chuc nang chinh",
  "Kiem thu va xu ly loi"
)

foreach ($key in $sprintStoryKeys) {
  if (-not $byKey.ContainsKey($key)) { continue }
  $story = $byKey[$key]
  $subtasks = @($story.fields.subtasks)
  for ($i = $subtasks.Count; $i -lt 3; $i++) {
    Create-Subtask -ParentKey $key -Summary "$($subtaskTemplates[$i]) - $($story.fields.summary)" -AssigneeAccountId $story.fields.assignee.accountId -IssueTypeId $subtaskType.id
  }
}

$progressPlan = [ordered]@{
  Day1 = @("WS-12","WS-13","WS-16","WS-17")
  Day2 = @("WS-24","WS-25","WS-26","WS-27","WS-28","WS-29")
  Day3 = @("WS-30","WS-31")
}
$planPath = Join-Path $OutputDir "jira-progress-plan.json"
($progressPlan | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $planPath -Encoding UTF8

Write-Host "Wrote live snapshot: $issuesPath"
Write-Host "Wrote progress plan: $planPath"
if (-not $Apply) {
  Write-Host "Dry run only. Re-run with -Apply to make changes."
}
