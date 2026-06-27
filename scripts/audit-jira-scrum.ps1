param(
  [string]$InputCsv = "e:\Jira (6).csv",
  [string]$OutputDir = ".\jira-audit-output"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName Microsoft.VisualBasic

function Read-JiraCsv {
  param([string]$Path)

  $raw = Get-Content -LiteralPath $Path -Encoding UTF8 -Raw
  $reader = New-Object System.IO.StringReader($raw)
  $parser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($reader)
  $parser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
  $parser.SetDelimiters(",")

  $rows = New-Object System.Collections.Generic.List[object]
  while (-not $parser.EndOfData) {
    [void]$rows.Add($parser.ReadFields())
  }
  $parser.Close()

  if ($rows.Count -lt 2) {
    throw "CSV has no Jira issue rows: $Path"
  }

  $data = @()
  for ($i = 1; $i -lt $rows.Count; $i++) {
    $data += ,$rows[$i]
  }

  [pscustomobject]@{
    Headers = $rows[0]
    Rows = $data
  }
}

function Get-Index {
  param([object[]]$Headers, [string]$Name)

  $index = [array]::IndexOf($Headers, $Name)
  if ($index -lt 0) {
    throw "Missing expected Jira CSV column: $Name"
  }
  $index
}

function ConvertTo-Issues {
  param([object]$Parsed)

  $h = $Parsed.Headers
  $idxSummary = Get-Index $h "Summary"
  $idxKey = Get-Index $h "Issue key"
  $idxType = Get-Index $h "Issue Type"
  $idxStatus = Get-Index $h "Status"
  $idxPriority = Get-Index $h "Priority"
  $idxAssignee = Get-Index $h "Assignee"
  $idxDescription = Get-Index $h "Description"
  $idxStoryPoint = Get-Index $h "Custom field (Story point estimate)"
  $idxParentKey = Get-Index $h "Parent key"
  $idxResolved = Get-Index $h "Resolved"
  $idxStatusChanged = Get-Index $h "Status Category Changed"
  $idxStartDate = Get-Index $h "Custom field (Start date)"

  $sprintIndexes = @()
  for ($i = 0; $i -lt $h.Count; $i++) {
    if ($h[$i] -eq "Sprint") {
      $sprintIndexes += $i
    }
  }

  foreach ($row in $Parsed.Rows) {
    $sprints = @()
    foreach ($idx in $sprintIndexes) {
      if ($idx -lt $row.Count -and -not [string]::IsNullOrWhiteSpace($row[$idx])) {
        $sprints += $row[$idx]
      }
    }

    [pscustomobject]@{
      Key = $row[$idxKey]
      Summary = $row[$idxSummary]
      Type = $row[$idxType]
      Status = $row[$idxStatus]
      Priority = $row[$idxPriority]
      Assignee = $row[$idxAssignee]
      Description = $row[$idxDescription]
      StoryPoint = $row[$idxStoryPoint]
      ParentKey = $row[$idxParentKey]
      Resolved = $row[$idxResolved]
      StatusChanged = $row[$idxStatusChanged]
      StartDate = $row[$idxStartDate]
      Sprints = $sprints
    }
  }
}

function Get-DatePart {
  param([string]$JiraDate)

  if ($JiraDate -match "^(\d{1,2}/[A-Za-z]+/\d{2,4})") {
    return $matches[1]
  }
  $null
}

function Add-Result {
  param(
    [System.Collections.Generic.List[object]]$Results,
    [string]$Category,
    [string]$Requirement,
    [bool]$Passed,
    [string]$Evidence,
    [string]$Fix
  )

  [void]$Results.Add([pscustomobject]@{
    Category = $Category
    Requirement = $Requirement
    Result = if ($Passed) { "PASS" } else { "FAIL" }
    Evidence = $Evidence
    Fix = $Fix
  })
}

function New-SuggestedSubtaskRows {
  param([object[]]$SprintStorySummaries)

  $templates = @(
    "Thiet ke giao dien / luong xu ly",
    "Lap trinh chuc nang chinh",
    "Kiem thu va xu ly loi"
  )

  $rows = @()
  foreach ($story in $SprintStorySummaries) {
    if ($story.SubtaskCount -ge 3) {
      continue
    }

    for ($i = $story.SubtaskCount; $i -lt 3; $i++) {
      $rows += [pscustomobject]@{
        "Issue Type" = "Sub-task"
        "Parent key" = $story.Key
        "Summary" = "$($templates[$i]) - $($story.Summary)"
        "Description" = "Auto suggestion: each Sprint User Story should have at least 3 subtasks."
        "Priority" = if ([string]::IsNullOrWhiteSpace($story.Priority)) { "Medium" } else { $story.Priority }
        "Assignee" = $story.StoryAssignee
        "Sprint" = $story.Sprint
      }
    }
  }

  $rows
}

function New-MarkdownReport {
  param(
    [object[]]$Issues,
    [object[]]$Results,
    [object[]]$SprintStories,
    [object[]]$SuggestedRows,
    [string]$SourceCsv
  )

  $us = @($Issues | Where-Object { $_.Summary -match "^US\d+" })
  $uniqueUsCodes = @($us | ForEach-Object {
    if ($_.Summary -match "^(US\d+)") { $matches[1] }
  } | Sort-Object -Unique)
  $generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# Jira Scrum Audit")
  $lines.Add("")
  $lines.Add("- Source: ``$SourceCsv``")
  $lines.Add("- Generated: $generatedAt")
  $lines.Add("- Total issues: $($Issues.Count)")
  $lines.Add("- Unique User Stories: $($uniqueUsCodes.Count)")
  $lines.Add("")

  $lines.Add("## Summary")
  foreach ($group in ($Results | Group-Object Category)) {
    $pass = @($group.Group | Where-Object Result -eq "PASS").Count
    $fail = @($group.Group | Where-Object Result -eq "FAIL").Count
    $lines.Add("- $($group.Name): $pass pass, $fail fail")
  }
  $lines.Add("")

  $lines.Add("## Findings")
  $lines.Add("| Category | Requirement | Result | Evidence | Fix |")
  $lines.Add("|---|---|---|---|---|")
  foreach ($result in $Results) {
    $evidence = $result.Evidence -replace "\|", "/"
    $fix = $result.Fix -replace "\|", "/"
    $lines.Add("| $($result.Category) | $($result.Requirement) | $($result.Result) | $evidence | $fix |")
  }
  $lines.Add("")

  $lines.Add("## Sprint Stories")
  $lines.Add("| Key | Summary | Status | SP | Subtasks | Done Subtasks | Assignees |")
  $lines.Add("|---|---|---|---:|---:|---:|---|")
  foreach ($story in $SprintStories) {
    $lines.Add("| $($story.Key) | $($story.Summary) | $($story.Status) | $($story.StoryPoint) | $($story.SubtaskCount) | $($story.DoneSubtaskCount) | $($story.SubtaskAssignees) |")
  }
  $lines.Add("")

  $lines.Add("## Done By Assignee")
  $doneByAssignee = @($Issues | Where-Object { $_.Status -eq "Done" } | Group-Object Assignee)
  if ($doneByAssignee.Count -eq 0) {
    $lines.Add("- No Done issues found.")
  } else {
    foreach ($group in $doneByAssignee) {
      $lines.Add("- $($group.Name): $($group.Count)")
    }
  }
  $lines.Add("")

  $lines.Add("## Generated Import Rows")
  $lines.Add("- Suggested missing subtasks: $($SuggestedRows.Count)")

  $lines -join "`r`n"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$parsed = Read-JiraCsv -Path $InputCsv
$issues = @(ConvertTo-Issues -Parsed $parsed)
$results = New-Object System.Collections.Generic.List[object]

$userStories = @($issues | Where-Object { $_.Summary -match "^US\d+" })
$uniqueUserStoryCodes = @($userStories | ForEach-Object {
  if ($_.Summary -match "^(US\d+)") { $matches[1] }
} | Sort-Object -Unique)
$storyPoints = @($userStories | Where-Object { -not [string]::IsNullOrWhiteSpace($_.StoryPoint) })
$priorityGroups = @($userStories | Group-Object Priority)
$sprintStories = @($userStories | Where-Object { $_.Sprints.Count -gt 0 })
$doneStories = @($userStories | Where-Object { $_.Status -eq "Done" })
$allStatuses = @($issues | Group-Object Status | ForEach-Object { $_.Name })
$changedDates = @($issues | ForEach-Object { Get-DatePart $_.StatusChanged } | Where-Object { $_ } | Sort-Object -Unique)
$resolvedDates = @($issues | ForEach-Object { Get-DatePart $_.Resolved } | Where-Object { $_ } | Sort-Object -Unique)
$startDates = @($issues | Where-Object { -not [string]::IsNullOrWhiteSpace($_.StartDate) } | Select-Object -ExpandProperty StartDate -Unique)

Add-Result $results "3.1 Product Backlog" "At least 10 User Stories" ($uniqueUserStoryCodes.Count -ge 10) "$($uniqueUserStoryCodes.Count) unique US found" "Create enough US issues in Product Backlog."
Add-Result $results "3.1 Product Backlog" "Each US has Story Point" ($storyPoints.Count -eq $userStories.Count) "$($storyPoints.Count)/$($userStories.Count) US have SP" "Add missing Story Point values."
Add-Result $results "3.1 Product Backlog" "Priority is differentiated" ($priorityGroups.Count -gt 1) "$(($priorityGroups | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ', ')" "Use High/Medium/Low logically."
Add-Result $results "3.1 Product Backlog" "Backlog priority order is reviewable" $false "CSV cannot prove backlog rank; Highest/High items are not all at top in export order" "Move highest priority US to the top of Product Backlog in Jira."

Add-Result $results "3.2 Sprint Backlog" "Sprint date is present" ($startDates.Count -gt 0) "$($startDates.Count) start date values found" "Set Sprint start/end date in Jira."
Add-Result $results "3.2 Sprint Backlog" "At least 3 US in Sprint" ($sprintStories.Count -ge 3) "$($sprintStories.Count) US in Sprint" "Move at least 3 existing Product Backlog US into Sprint."
$sprintGwtCount = @($sprintStories | Where-Object { $_.Description -match "Given" -and $_.Description -match "When" -and $_.Description -match "Then" }).Count
Add-Result $results "3.2 Sprint Backlog" "Sprint US have Given-When-Then AC" ($sprintStories.Count -gt 0 -and $sprintGwtCount -eq $sprintStories.Count) "$sprintGwtCount/$($sprintStories.Count)" "Add at least 2 GWT acceptance criteria to every Sprint US."

$sprintStorySummaries = foreach ($story in $sprintStories) {
  $subtasks = @($issues | Where-Object { $_.Type -match "Subtask|Sub-task" -and $_.ParentKey -eq $story.Key })
  [pscustomobject]@{
    Key = $story.Key
    Summary = $story.Summary
    Status = $story.Status
    Priority = $story.Priority
    StoryPoint = $story.StoryPoint
    StoryAssignee = $story.Assignee
    Sprint = (($story.Sprints | Select-Object -First 1) -as [string])
    SubtaskCount = $subtasks.Count
    DoneSubtaskCount = @($subtasks | Where-Object Status -eq "Done").Count
    SubtaskAssignees = (($subtasks | Select-Object -ExpandProperty Assignee -Unique) -join ", ")
  }
}

$storiesWithEnoughSubtasks = @($sprintStorySummaries | Where-Object { $_.SubtaskCount -ge 3 })
Add-Result $results "3.2 Sprint Backlog" "Each Sprint US has at least 3 subtasks" ($sprintStories.Count -gt 0 -and $storiesWithEnoughSubtasks.Count -eq $sprintStories.Count) "$($storiesWithEnoughSubtasks.Count)/$($sprintStories.Count)" "Create missing subtasks for Sprint US."

$taskCount = @($issues | Where-Object { $_.Type -match "Task|Subtask|Sub-task" }).Count
$assignedTaskCount = @($issues | Where-Object { $_.Type -match "Task|Subtask|Sub-task" -and -not [string]::IsNullOrWhiteSpace($_.Assignee) }).Count
Add-Result $results "3.2 Sprint Backlog" "Tasks have assignees" ($assignedTaskCount -eq $taskCount) "$assignedTaskCount/$taskCount assigned task/subtask issues" "Assign every task/subtask to one member."

$hasBoardColumns = (@("To Do","In Progress","Done") | Where-Object { $allStatuses -contains $_ }).Count -eq 3
Add-Result $results "3.3 Kanban" "Board has To Do, In Progress, Done" $hasBoardColumns "$(($issues | Group-Object Status | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ', ')" "Keep columns To Do, In Progress, Done or equivalents."
Add-Result $results "3.3 Kanban" "Progress across at least 3 workdays" ($changedDates.Count -ge 3 -or $resolvedDates.Count -ge 3) "Status dates: $($changedDates -join ', '); Resolved dates: $($resolvedDates -join ', ')" "Move tasks through statuses on at least 3 different workdays."
Add-Result $results "3.3 Kanban" "At least 3 US Done" ($doneStories.Count -ge 3) "$($doneStories.Count) US Done" "Complete at least 3 Sprint US."

$doneByAssignee = @($issues | Where-Object { $_.Status -eq "Done" } | Group-Object Assignee)
Add-Result $results "3.3 Kanban" "Each visible member has Done work" ($doneByAssignee.Count -ge 4) "$(($doneByAssignee | ForEach-Object { "$($_.Name):$($_.Count)" }) -join ', ')" "Ensure every member has at least 1 Done task/subtask."

Add-Result $results "3.4 Burndown" "Burndown data spans 3 workdays" ($resolvedDates.Count -ge 3) "Resolved dates: $($resolvedDates -join ', ')" "Burndown needs issues completed across at least 3 days; Jira generates the chart automatically."

$suggestedRows = @(New-SuggestedSubtaskRows -SprintStorySummaries $sprintStorySummaries)

$report = New-MarkdownReport -Issues $issues -Results $results -SprintStories $sprintStorySummaries -SuggestedRows $suggestedRows -SourceCsv $InputCsv
$reportPath = Join-Path $OutputDir "jira-scrum-audit.md"
$report | Set-Content -LiteralPath $reportPath -Encoding UTF8

$findingsPath = Join-Path $OutputDir "jira-findings.csv"
$results | Export-Csv -LiteralPath $findingsPath -Encoding UTF8 -NoTypeInformation

$subtaskPath = Join-Path $OutputDir "jira-suggested-subtasks-import.csv"
$suggestedRows | Export-Csv -LiteralPath $subtaskPath -Encoding UTF8 -NoTypeInformation

Write-Host "Audit complete."
Write-Host "Report: $reportPath"
Write-Host "Findings CSV: $findingsPath"
Write-Host "Suggested subtask import CSV: $subtaskPath"
