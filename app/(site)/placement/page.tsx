import { Band, CTABand, FAQList } from "@/components/site/marketing";
import { HeroAnimated } from "@/components/site/hero";
import { PlacementScene, PlacementCompare } from "@/components/site/device-anim";
import { QualificationForm } from "@/components/site/qualification-form";

export const metadata = {
  title: "Placement · Channel Cast",
  description: "Free or paid placement — see how your location qualifies to host a Channel Cast device and earn.",
};

export default function PlacementPage() {
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

      <Band eyebrow="The models" title="Free vs paid, at a glance" subtitle="Toggle the two placement types — same device, different way in.">
        <PlacementScene />
      </Band>

      <Band eyebrow="Compare" title="What each model includes" muted>
        <PlacementCompare />
      </Band>

      <section id="qualify" className="scroll-mt-20">
        <Band eyebrow="Qualify" title="Find out where your location fits" subtitle="Answer a few questions and we'll tell you whether you qualify for free placement — or how paid placement can earn for you.">
          <div className="mx-auto max-w-2xl"><QualificationForm /></div>
        </Band>
      </section>

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
