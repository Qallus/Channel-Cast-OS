import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { NfcPhoneWriter } from "@/components/business-cards/nfc-phone-writer";
import { loadCardById } from "@/lib/business-cards/store";
import { requireUser, AuthError } from "@/lib/server/require-user";

export const metadata = { title: "Write NFC · Channel Cast" };
export const dynamic = "force-dynamic";

// Opened on a phone from the QR in the card list's NFC dialog, so a desktop
// user can finish programming items on a device that can actually write them.
export default async function CardNfcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); }
  catch (err) { if (err instanceof AuthError && err.status === 401) redirect(`/login?next=/app/admin/business-cards/${id}/nfc`); throw err; }

  const card = await loadCardById(id);
  if (!card) notFound();
  // Same rule as the card API: owners manage their own, admins manage any.
  if (!user.isAdmin && card.owner_id !== user.id) redirect("/app/admin/business-cards");

  const name = card.display_name || [card.first_name, card.last_name].filter(Boolean).join(" ") || card.card_name;

  return (
    <div className="mx-auto max-w-md space-y-5 py-4">
      <Link href="/app/admin/business-cards" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Business cards
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Write to an NFC item</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap a card, bracelet, ring or sticker to program it with {name}&apos;s card.</p>
      </div>
      <NfcPhoneWriter cardId={card.id} slug={card.slug} published={card.status === "published"} />
    </div>
  );
}
