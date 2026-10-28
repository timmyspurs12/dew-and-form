import React from "react";
import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <aside
      aria-label="Privacy and data handling notice"
      className="rounded-editorial border border-stone-border bg-canvas-subtle/70 p-4 text-xs leading-relaxed text-ink-secondary"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-sage-botanical"
          aria-hidden="true"
        />
        <div className="space-y-1.5">
          <p className="font-medium text-ink">
            Considered image handling &amp; privacy
          </p>
          <p>
            Selecting or capturing a portrait creates a local browser preview only—nothing leaves your
            device until you press <strong className="font-medium text-ink">Analyse my skin</strong>.
            When submitted, your image is validated on Dew &amp; Form&apos;s server (keeping{" "}
            <code className="font-mono text-[11px] text-ink">YOUCAM_API_KEY</code> strictly server-side)
            and transferred privately via YouCam&apos;s File API to Perfect Corp&apos;s YouCam AI Skin
            Analysis v2.1 service without creating a public image URL.
          </p>
          <p>
            Dew &amp; Form does not store your portrait in any database or permanent bucket. Per Perfect
            Corp&apos;s published S2S retention policy, temporary result download and mask URLs expire
            after approximately 2 hours, and uploaded provider file records are automatically purged by
            Perfect Corp within 30 days. Results are informational only and not a medical or
            dermatological diagnosis.
          </p>
        </div>
      </div>
    </aside>
  );
}
