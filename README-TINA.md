# A/R Reconciliation Tool — Working Rules

This version keeps the original Manus workflow and uses these rules:

- Upload two CSV or Excel A/R reports.
- Required mappings: Invoice ID, Customer Name, Invoice Date, and Balance.
- Invoices are matched by Invoice ID.
- Balances must match exactly.
- Customer Name and Invoice Date are displayed for reference.
- Status is not mapped or compared.
- Results show matched invoices, invoices found only in either report, and balance mismatches.

## Running the project

This is the complete source project. It can be opened or republished in Manus, or run with Node.js after installing dependencies:

1. `corepack pnpm install`
2. `corepack pnpm dev`

## Validation with CJR reports

Using `CJR AR Detail.xlsx` and `cjr-invoices-export.csv`, the reconciliation rules produced:

- Report A invoices: 531
- Report B invoices: 510
- Matched: 463
- Only in Report A: 59
- Only in Report B: 38
- Balance mismatches: 9
- Total discrepancies: 106
