import { Band, CTABand, FAQList, PageHero } from "@/components/site/marketing";

export const metadata = { title: "FAQ · Channel Cast", description: "Answers to common questions about motion-based audio advertising, hardware, privacy, and getting paid." };

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="FAQ" title="Answers to common questions." subtitle="Everything about how Channel Cast senses presence, plays spots, protects privacy, and pays hosts." />

      <Band eyebrow="Getting started" title="Setup & hardware">
        <FAQList items={[
          ["What hardware is required?", "Any Windows mini-PC with a speaker, plus a USB webcam for motion/vision. Raspberry Pi support is on the roadmap."],
          ["How long does setup take?", "About a minute — register the device to get a claim code and a one-line install command, paste it into PowerShell, and it connects automatically."],
          ["Does it work offline?", "Devices need internet to receive schedules and report plays, but cache audio locally so playback continues through brief outages."],
          ["Can I run scheduled-only?", "Yes. Motion is optional — a device can simply loop spots on a schedule."],
        ]} />
      </Band>

      <Band eyebrow="Privacy" title="Audience & privacy" muted>
        <FAQList items={[
          ["Is my audience recorded?", "No. Vision runs on the device and produces only anonymous counts — never images or identities. Nothing about visitors is stored or uploaded."],
          ["How does audience matching work?", "On vision devices, the spot is matched to how many people are present at the moment motion fires — a count, not a profile."],
        ]} />
      </Band>

      <Band eyebrow="Advertisers & hosts" title="Booking & earnings">
        <FAQList items={[
          ["How do advertisers book space?", "Browse the marketplace, pick a space, choose dates, and deploy an audio spot — it lands on that space's devices automatically."],
          ["How do hosts get paid?", "Hosting a device turns your space into bookable inventory. Earnings accrue per booking and appear in your owner dashboard alongside plays and fill rate."],
          ["What does a play cost?", "Pricing is per space and shown on each listing. You control budget and schedule from the advertiser dashboard."],
        ]} />
      </Band>

      <CTABand title="Still have questions?" subtitle="Talk to the team — we're happy to help." primary={{ label: "Contact us", href: "/contact" }} secondary={{ label: "How it works", href: "/how-it-works" }} />
    </>
  );
}
