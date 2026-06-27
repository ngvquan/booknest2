# Jira Scrum Audit

- Source: `e:\Jira (6).csv`
- Generated: 2026-06-24 21:39:34
- Total issues: 31
- Unique User Stories: 11

## Summary
- 3.1 Product Backlog: 2 pass, 2 fail
- 3.2 Sprint Backlog: 2 pass, 3 fail
- 3.3 Kanban: 3 pass, 1 fail
- 3.4 Burndown: 0 pass, 1 fail

## Findings
| Category | Requirement | Result | Evidence | Fix |
|---|---|---|---|---|
| 3.1 Product Backlog | At least 10 User Stories | PASS | 11 unique US found | Create enough US issues in Product Backlog. |
| 3.1 Product Backlog | Each US has Story Point | FAIL | 12/13 US have SP | Add missing Story Point values. |
| 3.1 Product Backlog | Priority is differentiated | PASS | Medium:6, High:4, Low:2, Highest:1 | Use High/Medium/Low logically. |
| 3.1 Product Backlog | Backlog priority order is reviewable | FAIL | CSV cannot prove backlog rank; Highest/High items are not all at top in export order | Move highest priority US to the top of Product Backlog in Jira. |
| 3.2 Sprint Backlog | Sprint date is present | FAIL | 0 start date values found | Set Sprint start/end date in Jira. |
| 3.2 Sprint Backlog | At least 3 US in Sprint | PASS | 5 US in Sprint | Move at least 3 existing Product Backlog US into Sprint. |
| 3.2 Sprint Backlog | Sprint US have Given-When-Then AC | FAIL | 3/5 | Add at least 2 GWT acceptance criteria to every Sprint US. |
| 3.2 Sprint Backlog | Each Sprint US has at least 3 subtasks | FAIL | 3/5 | Create missing subtasks for Sprint US. |
| 3.2 Sprint Backlog | Tasks have assignees | PASS | 30/30 assigned task/subtask issues | Assign every task/subtask to one member. |
| 3.3 Kanban | Board has To Do, In Progress, Done | PASS | Done:11, In Progress:11, To Do:9 | Keep columns To Do, In Progress, Done or equivalents. |
| 3.3 Kanban | Progress across at least 3 workdays | FAIL | Status dates: 17/Jun/26, 24/Jun/26; Resolved dates: 24/Jun/26 | Move tasks through statuses on at least 3 different workdays. |
| 3.3 Kanban | At least 3 US Done | PASS | 6 US Done | Complete at least 3 Sprint US. |
| 3.3 Kanban | Each visible member has Done work | PASS | hliem150306:1, ng quan:1, Trương Quang Tùng:4, giap:4, Lường Khắc Huy:1 | Ensure every member has at least 1 Done task/subtask. |
| 3.4 Burndown | Burndown data spans 3 workdays | FAIL | Resolved dates: 24/Jun/26 | Burndown needs issues completed across at least 3 days; Jira generates the chart automatically. |

## Sprint Stories
| Key | Summary | Status | SP | Subtasks | Done Subtasks | Assignees |
|---|---|---|---:|---:|---:|---|
| WS-3 | US03 - Tạo nhóm chi tiêu | Done | 5.0 | 6 | 2 | anhnhut7432, Trương Quang Tùng, giap, ng quan |
| WS-1 | US01 - Đăng ký tài khoản | Done | 3.0 | 5 | 0 | Lường Khắc Huy, Thanhchamhoc2006, giap |
| WS-5 | US05 - Thêm khoản chi tiêu | In Progress | 5.0 | 7 | 3 | giap, Thanhchamhoc2006, Lường Khắc Huy, ng quan |
| WS-30 | US09 - Xem báo cáo chi tiêu theo tháng | To Do |  | 0 | 0 |  |
| WS-31 | US07 - Xem số dư công nợ | Done | 5.0 | 0 | 0 |  |

## Done By Assignee
- hliem150306: 1
- ng quan: 1
- Trương Quang Tùng: 4
- giap: 4
- Lường Khắc Huy: 1

## Generated Import Rows
- Suggested missing subtasks: 6
