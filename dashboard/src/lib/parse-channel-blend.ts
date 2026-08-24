import ExcelJS from "exceljs";
import crypto from "crypto";
import { Readable } from "stream";

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
  name: "leadName",
  "new contact": "newContact",
  "phone number": "phoneNumber",
  state: "state",
  "email on file": "emailOnFile",
  "preferred email": "preferredEmail",
  details: "details",
  notes: "details",
};

function cellText(cell: ExcelJS.Cell): string | null {
  const v = cell.value;
  if (v == null) return null;
  if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text ?? "");
  if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result ?? "");
  return String(v).trim() || null;
}

function findHeaderValue(
  raw: Record<string, string | null>,
  matcher: RegExp
): string | null {
  for (const [header, value] of Object.entries(raw)) {
    if (matcher.test(header.trim())) return value;
  }
  return null;
}

// CSV exports have no sheet tabs to name the disposition category, so it's
// pulled from the filename instead — uploaders consistently name exports
// like "Channel Blend Export (Email Requests) (2).csv", so the last
// non-numeric parenthetical is a reliable stand-in for a sheet name.
function categoryFromFilename(filename: string): string {
  const parens = [...filename.matchAll(/\(([^()]+)\)/g)];
  for (let i = parens.length - 1; i >= 0; i--) {
    const text = parens[i][1].trim();
    if (text && !/^\d+$/.test(text)) return text;
  }
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return base || "Imported";
}

function extractRows(workbook: ExcelJS.Workbook): ChannelBlendRow[] {
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

      // "Name" + "Last name" as separate columns (common in CSV exports)
      // combine into leadName instead of the last one silently winning.
      const lastName = findHeaderValue(raw, /^last\s*name$/i);
      if (lastName) {
        known.leadName = [known.leadName, lastName].filter(Boolean).join(" ").trim() || null;
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

export async function parseChannelBlendWorkbook(
  buffer: ArrayBuffer,
  filename: string
): Promise<ChannelBlendRow[]> {
  const isCsv = /\.csv$/i.test(filename);
  const workbook = new ExcelJS.Workbook();

  if (isCsv) {
    // ExcelJS's zip-based xlsx loader chokes on plain CSV ("Can't find end
    // of central directory") since xlsx files are zip archives and CSVs
    // aren't — CSV needs its own text-based reader instead.
    const text = Buffer.from(buffer).toString("utf-8").replace(/^﻿/, "");
    const worksheet = await workbook.csv.read(Readable.from([text]));
    worksheet.name = categoryFromFilename(filename);
  } else {
    await workbook.xlsx.load(buffer);
  }

  return extractRows(workbook);
}
