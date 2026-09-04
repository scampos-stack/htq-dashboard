"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { KeapBroadcastForm } from "./KeapBroadcastForm";

// Moves the broadcast-logging form out of the always-visible reporting
// view into an on-demand modal — an operational input shouldn't sit
// inline between data cards (design review feedback).
export function LogBroadcastButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-charcoal/90"
      >
        + Log Broadcast
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log a Broadcast">
        <KeapBroadcastForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
