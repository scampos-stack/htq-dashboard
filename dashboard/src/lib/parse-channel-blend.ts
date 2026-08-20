import ExcelJS from "exceljs";
import crypto from "crypto";

export type ChannelBlendRow = {
  rowHash: string;
  category: string;
  leadName: string | null;
  newContact: string | null;
  phoneNumber: string | null;
  state: string | null;
  emailOnFile: string | null;
  preferredEmail: string | null;
  details: string | null;
  raw: Record<string, unknown>;
};

// Known columns get promoted to first-class fields when present. Any other
// column on any sheet is still captured in `raw` — a sheet with unrecognized
// headers (e.g. a new "Sold" or "T&Cs Sent" tab with its own columns) is
// never silently skipped, just stored generically.
const HEADER_ALIASES: Record<string, keyof ChannelBlendRow> = {
  "lead name": "leadName",
  "new contact": "newContact",
  "phone number": "phoneNumber",
  state: "state",
  "email on file": "emailOnFile",
  "preferred email": "preferredEmail",
  details: "details",
};

function cellText(cell: ExcelJS.Cell): string | null {
  const v = cell.value;
  if (v == null) return null;
  if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text ?? "");
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "");
  return String(v).trim() || null;
}

export async function parseChannelBlendWorkbook(
  buffer: ArrayBuffer
): Promise<ChannelBlendRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const rows: ChannelBlendRow[] = [];

  for (const worksheet of workbook.worksheets) {
    const category = worksheet.name.trim();
    const headerRow = worksheet.getRow(1);

    // colNumber -> raw header text, for every non-empty header cell —
    // not filtered to known aliases, so unfamiliar sheets still parse.
    const headers = new Map<number, string>();
    headerRow.eachCell((cell, colNumber) => {
      const text = cellText(cell);
      if (text) headers.set(colNumber, text);
    });
    if (headers.size === 0) continue;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const raw: Record<string, string | null> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers.get(colNumber);
        if (header) raw[header] = cellText(cell);
      });

      const hasData = Object.values(raw).some((v) => v && v.trim());
      if (!hasData) return;

      const known: Partial<ChannelBlendRow> = {};
      for (const [header, value] of Object.entries(raw)) {
        const field = HEADER_ALIASES[header.toLowerCase()];
        if (field) known[field] = value as never;
      }

      const stableRaw = Object.fromEntries(
        Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))
      );
      const rowHash = crypto
        .createHash("sha256")
        .update(`${category}|${JSON.stringify(stableRaw)}`)
        .digest("hex");

      rows.push({
        rowHash,
        category,
        leadName: known.leadName ?? null,
        newContact: known.newContact ?? null,
        phoneNumber: known.phoneNumber ?? null,
        state: known.state ?? null,
        emailOnFile: known.emailOnFile ?? null,
        preferredEmail: known.preferredEmail ?? null,
        details: known.details ?? null,
        raw,
      });
    });
  }

  return rows;
}
