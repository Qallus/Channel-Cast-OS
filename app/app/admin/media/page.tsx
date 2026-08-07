import { MediaManager } from "@/components/media/media-manager";
import { getAllListings } from "@/lib/marketing/listings";
import { getMediaConfig } from "@/lib/server/media-config";
import { getListingContentMap } from "@/lib/server/listing-content-config";

export const metadata = { title: "Media · Channel Cast" };
export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const [{ listings }, media, content] = await Promise.all([getAllListings(), getMediaConfig(), getListingContentMap()]);
  const items = listings.map((l) => ({ slug: l.slug, name: l.name, type: l.type }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media</h1>
        <p className="text-muted-foreground">Photos and details for your marketplace spaces and marketing pages — pick from the royalty-free library, or edit each listing&apos;s headline, rating, and features.</p>
      </div>
      <MediaManager listings={items} initial={media} content={content} />
    </div>
  );
}
