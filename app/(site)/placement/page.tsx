import { Band, CTABand, FAQList } from "@/components/site/marketing";
import { HeroAnimated } from "@/components/site/hero";
import { PlacementScene, PlacementCompare } from "@/components/site/device-anim";
import { getPlacementConfig } from "@/lib/server/placement-config";

export const metadata = {
  title: "Placement · Channel Cast",
  description: "Free or paid placement — see how your location qualifies to host a Channel Cast device and earn.",
};

export const dynamic = "force-dynamic";

export default async function PlacementPage() {
  const config = await getPlacementConfig();
  return (
    <>
      <HeroAnimated
        variant="businesses"
        eyebrow="Placement"
        title={<>Two ways to place a device. <span className="text-brand-strong">Both win.</span></>}
        subtitle="Every location gets the same hardware and software. What differs is how you get in — and whether you earn. See which model fits your space."
        primary={{ label: "Check if you qualify", href: "#qualify" }}
        secondary={{ label: "Talk to us", href: "/contact" }}
      />

      <section id="qualify" className="scroll-mt-20">
        <Band eyebrow="The models" title="Free vs paid — check your fit" subtitle="Toggle a placement type. Under free, answer a few questions to see if your location qualifies.">
          <PlacementScene minDailyVisitors={config.minDailyVisitors} />
        </Band>
      </section>

      <Band eyebrow="Compare" title="What each model includes" muted>
        <PlacementCompare />
      </Band>

      <Band eyebrow="FAQ" title="Common questions" muted>
        <FAQList items={[
          ["How do I qualify for free placement?", "Free placement is based on foot traffic. If your location sees enough visitors, we place a device at no cost — hardware and software included. The form above gives you an instant read."],
          ["What does paid placement cost?", "A small monthly fee. In return you get the device, the full dashboard, and the ability to sell ad space to your own clients and keep the revenue."],
          ["Who owns the hardware?", "Channel Cast provides and maintains the device in both models. You just host it."],
          ["Can I switch models later?", "Yes. If your traffic grows into free territory — or you'd rather start earning on paid — we can adjust your plan."],
        ]} />
      </Band>

      <CTABand title="See where your space fits." subtitle="Two minutes to find out." primary={{ label: "Check if you qualify", href: "#qualify" }} secondary={{ label: "Explore the marketplace", href: "/marketplace" }} />
    </>
  );
}
