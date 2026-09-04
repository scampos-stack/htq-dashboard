"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { ChannelBlendUpload } from "./ChannelBlendUpload";

// Moves the CSV upload form out of the always-visible reporting view into
// an on-demand modal — same reasoning as LogBroadcastButton. Left open
// after a successful upload (rather than auto-closing) so the parsed/
// inserted/duplicates summary ChannelBlendUpload renders stays visible.
export function UploadChannelBlendButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700"
      >
        ↑ Upload CSV
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Upload Channel Blend Results">
        <ChannelBlendUpload />
      </Modal>
    </>
  );
}
