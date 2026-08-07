import { MediaManager } from "@/components/media/media-manager";
import { getAllListings } from "@/lib/marketing/listings";
import { getMediaConfig } from "@/lib/server/media-config";

export const metadata = { title: "Media · Channel Cast" };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const [{ listings }, media] = await Promise.all([getAllListings(), getMediaConfig()]);
  const items = listings.map((l) => ({ slug: l.slug, name: l.name, type: l.type }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media</h1>
        <p className="text-muted-foreground">Photos for your marketplace spaces and marketing pages — pick from the royalty-free library or paste your own.</p>
      </div>
      <MediaManager listings={items} initial={media} />
    </div>
  );
}
