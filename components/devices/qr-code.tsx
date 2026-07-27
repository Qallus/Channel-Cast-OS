"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils";

export function QrCode({ value, size = 176, className }: { value: string; size?: number; className?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#0a0f0a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className={cn("flex items-center justify-center rounded-lg bg-white p-2", className)}
      style={{ width: size, height: size }}
    >
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Device activation QR code" width={size - 16} height={size - 16} />
      ) : (
        <span className="text-xs text-neutral-400">Generating…</span>
      )}
    </div>
  );
}
