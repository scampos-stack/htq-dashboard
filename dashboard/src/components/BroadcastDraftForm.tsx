"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BroadcastDraft, BroadcastDraftStatus } from "@/lib/data";

const STATUS_OPTIONS: { value: BroadcastDraftStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "writing", label: "Writing" },
  { value: "for_approval", label: "For Approval" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
];

export type BroadcastDraftFormValues = {
  campaignTheme: string;
  targetDate: string;
  listSegment: string;
  focus: string;
  utmCampaign: string;
  audienceEstimate: string;
  status: BroadcastDraftStatus;
  subject: string;
  preheader: string;
  introParagraphs: string; // textarea, one paragraph per line
  highlightHeading: string;
  highlightBody: string;
  ctaText: string;
  ctaUrl: string;
  closingParagraph: string;
  signoffLine: string;
  signoffSubtext: string;
  footerNoteText: string;
  footerNoteLinkText: string;
  footerNoteLinkUrl: string;
};

const EMPTY: BroadcastDraftFormValues = {
  campaignTheme: "",
  targetDate: "",
  listSegment: "",
  focus: "",
  utmCampaign: "",
  audienceEstimate: "",
  status: "not_started",
  subject: "",
  preheader: "",
  introParagraphs: "",
  highlightHeading: "",
  highlightBody: "",
  ctaText: "",
  ctaUrl: "",
  closingParagraph: "",
  signoffLine: "Your friends at Hometown Quotes",
  signoffSubtext: "For agents. By agents.",
  footerNoteText: "",
  footerNoteLinkText: "",
  footerNoteLinkUrl: "",
};

export function draftToFormValues(draft: BroadcastDraft): BroadcastDraftFormValues {
  return {
    campaignTheme: draft.campaignTheme,
    targetDate: draft.targetDate,
    listSegment: draft.listSegment,
    focus: draft.focus ?? "",
    utmCampaign: draft.utmCampaign ?? "",
    audienceEstimate: draft.audienceEstimate != null ? String(draft.audienceEstimate) : "",
    status: draft.status,
    subject: draft.subject ?? "",
    preheader: draft.preheader ?? "",
    introParagraphs: draft.introParagraphs.join("\n"),
    highlightHeading: draft.highlightHeading ?? "",
    highlightBody: draft.highlightBody ?? "",
    ctaText: draft.ctaText ?? "",
    ctaUrl: draft.ctaUrl ?? "",
    closingParagraph: draft.closingParagraph ?? "",
    signoffLine: draft.signoffLine ?? "",
    signoffSubtext: draft.signoffSubtext ?? "",
    footerNoteText: draft.footerNoteText ?? "",
    footerNoteLinkText: draft.footerNoteLinkText ?? "",
    footerNoteLinkUrl: draft.footerNoteLinkUrl ?? "",
  };
}

function field(label: string, children: React.ReactNode, span?: "full") {
  return (
    <label className={`text-xs font-semibold text-body-gray ${span === "full" ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-charcoal";

export function BroadcastDraftForm({
  draftId,
  initialValues,
  onDone,
  onCancel,
}: {
  draftId?: number;
  initialValues?: BroadcastDraftFormValues;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = draftId != null;
  const [form, setForm] = useState<BroadcastDraftFormValues>(initialValues ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof BroadcastDraftFormValues>(key: K, value: BroadcastDraftFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaignTheme.trim() || !form.targetDate || !form.listSegment.trim()) {
      setError("Campaign theme, target date, and list segment are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        campaignTheme: form.campaignTheme,
        targetDate: form.targetDate,
        listSegment: form.listSegment,
        focus: form.focus,
        utmCampaign: form.utmCampaign,
        audienceEstimate: form.audienceEstimate,
        status: form.status,
        subject: form.subject,
        preheader: form.preheader,
        introParagraphs: form.introParagraphs.split("\n").map((p) => p.trim()).filter(Boolean),
        highlightHeading: form.highlightHeading,
        highlightBody: form.highlightBody,
        ctaText: form.ctaText,
        ctaUrl: form.ctaUrl,
        closingParagraph: form.closingParagraph,
        signoffLine: form.signoffLine,
        signoffSubtext: form.signoffSubtext,
        footerNoteText: form.footerNoteText,
        footerNoteLinkText: form.footerNoteLinkText,
        footerNoteLinkUrl: form.footerNoteLinkUrl,
      };
      const res = await fetch(isEdit ? `/api/broadcast-drafts/${draftId}` : "/api/broadcast-drafts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to save draft");
      router.refresh();
      if (!isEdit && data.id) {
        router.push(`/broadcast-drafts/${data.id}`);
      }
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={isEdit ? "" : "mb-6 rounded-3xl bg-white p-6 shadow-sm"}>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-body-gray">Details</h4>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field(
          "Campaign Theme",
          <input value={form.campaignTheme} onChange={(e) => set("campaignTheme", e.target.value)} className={inputClass} />,
          "full"
        )}
        {field(
          "Target Date",
          <input type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)} className={inputClass} />
        )}
        {field(
          "List Segment",
          <input value={form.listSegment} onChange={(e) => set("listSegment", e.target.value)} className={inputClass} placeholder="e.g. Farmers (AGP Store)" />
        )}
        {field(
          "Focus / Objective",
          <input value={form.focus} onChange={(e) => set("focus", e.target.value)} className={inputClass} placeholder="e.g. Sales" />
        )}
        {field(
          "UTM Campaign",
          <input value={form.utmCampaign} onChange={(e) => set("utmCampaign", e.target.value)} className={inputClass} />
        )}
        {field(
          "Audience (est.)",
          <input type="number" min="0" value={form.audienceEstimate} onChange={(e) => set("audienceEstimate", e.target.value)} className={inputClass} />
        )}
        {field(
          "Status",
          <select value={form.status} onChange={(e) => set("status", e.target.value as BroadcastDraftStatus)} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-body-gray">Email Content</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field(
          "Subject Line",
          <input value={form.subject} onChange={(e) => set("subject", e.target.value)} className={inputClass} />,
          "full"
        )}
        {field(
          "Preheader (hidden preview text)",
          <input value={form.preheader} onChange={(e) => set("preheader", e.target.value)} className={inputClass} />,
          "full"
        )}
        {field(
          "Intro Paragraphs (one per line)",
          <textarea value={form.introParagraphs} onChange={(e) => set("introParagraphs", e.target.value)} className={`${inputClass} min-h-[100px]`} />,
          "full"
        )}
        {field(
          "Highlight Box Heading (optional)",
          <input value={form.highlightHeading} onChange={(e) => set("highlightHeading", e.target.value)} className={inputClass} />
        )}
        {field(
          "Highlight Box Body (optional)",
          <input value={form.highlightBody} onChange={(e) => set("highlightBody", e.target.value)} className={inputClass} />
        )}
        {field(
          "CTA Button Text",
          <input value={form.ctaText} onChange={(e) => set("ctaText", e.target.value)} className={inputClass} />
        )}
        {field(
          "CTA URL",
          <input value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} className={inputClass} />
        )}
        {field(
          "Closing Paragraph (optional)",
          <textarea value={form.closingParagraph} onChange={(e) => set("closingParagraph", e.target.value)} className={`${inputClass} min-h-[70px]`} />,
          "full"
        )}
        {field(
          "Signoff Line",
          <input value={form.signoffLine} onChange={(e) => set("signoffLine", e.target.value)} className={inputClass} />
        )}
        {field(
          "Signoff Subtext",
          <input value={form.signoffSubtext} onChange={(e) => set("signoffSubtext", e.target.value)} className={inputClass} />
        )}
        {field(
          "Footer Note (optional)",
          <textarea value={form.footerNoteText} onChange={(e) => set("footerNoteText", e.target.value)} className={`${inputClass} min-h-[70px]`} />,
          "full"
        )}
        {field(
          "Footer Note Link Text",
          <input value={form.footerNoteLinkText} onChange={(e) => set("footerNoteLinkText", e.target.value)} className={inputClass} />
        )}
        {field(
          "Footer Note Link URL",
          <input value={form.footerNoteLinkUrl} onChange={(e) => set("footerNoteLinkUrl", e.target.value)} className={inputClass} />
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Draft"}
        </button>
        {isEdit && onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-semibold text-body-gray">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
