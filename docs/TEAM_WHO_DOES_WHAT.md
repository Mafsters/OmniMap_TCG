# Who does what – better task assignment

So that the app (and AI) can assign tasks to the right people, you can describe **what each person does** in addition to department and role. Not everyone in “Marketing” or “Tech” does the same job.

## Employees sheet: add a “Responsibilities” column

In your **Employees** (or **Team**) tab in Google Sheets, add a column that describes each person’s focus. The Apps Script reads it and uses it for AI task breakdown and assignment.

### Column position

- If your sheet **does not** have an Email column: add **Responsibilities** as the **12th column** (after ID, FirstName, LastName, Department, Team, Role, IsHoD, AccessLevel, ReportsTo, SalesAccess).
- If your sheet **has** an Email column (e.g. 5th column): add **Responsibilities** as the **13th column** (after SalesAccess).

### Header name

Use the header **Responsibilities** (or **What they do** – the script currently reads by column index, so keep it in the position above).

### What to put in it

Short, comma‑separated focus areas or responsibilities, for example:

| Name   | Department | Role        | Responsibilities |
|--------|------------|-------------|------------------|
| Jane   | Marketing  | Lead        | Social, partnerships, events |
| Alex   | Marketing  | Designer    | Brand, visual identity, merch |
| Sam    | Tech       | Engineer    | Backend, APIs, integrations |
| Jordan | Product    | PM          | Roadmap, discovery, specs |

The AI uses this when breaking down projects: e.g. “Launch merch store” will prefer assigning merch-related tasks to people whose responsibilities mention “merch” or “brand”.

## Optional: Team view in the app

A future “Team” or “Who does what” view in the app could list everyone with department, role, and responsibilities so you can edit or review it. For now, editing stays in the **Employees** sheet; after you sync, the app and AI use the updated data.

## Summary

1. Add a **Responsibilities** column to the Employees sheet (see position above).
2. Fill it with each person’s focus (e.g. “Social, partnerships, events”).
3. Sync from the app so the script fetches the new column.
4. When you use **“Use AI to generate tasks”** in New project, the AI will use role + department + responsibilities to suggest owners.
