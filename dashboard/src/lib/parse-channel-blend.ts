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

const HEADER_ALIASES: Record<string, string> = {
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
    const columnMap = new Map<number, string>();
    headerRow.eachCell((cell, colNumber) => {
      const raw = (cellText(cell) ?? "").toLowerCase();
      const field = HEADER_ALIASES[raw];
      if (field) columnMap.set(colNumber, field);
    });
    if (columnMap.size === 0) continue;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const record: Record<string, string | null> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const field = columnMap.get(colNumber);
        if (field) record[field] = cellText(cell);
      });

      const hasData = Object.values(record).some((v) => v && v.trim());
      if (!hasData) return;

      const hashInput = [
        category,
        record.leadName,
        record.phoneNumber,
        record.emailOnFile,
        record.details,
      ]
        .join("|")
        .toLowerCase();
      const rowHash = crypto.createHash("sha256").update(hashInput).digest("hex");

      rows.push({
        rowHash,
        category,
        leadName: record.leadName ?? null,
        newContact: record.newContact ?? null,
        phoneNumber: record.phoneNumber ?? null,
        state: record.state ?? null,
        emailOnFile: record.emailOnFile ?? null,
        preferredEmail: record.preferredEmail ?? null,
        details: record.details ?? null,
        raw: record,
      });
    });
  }

  return rows;
}
