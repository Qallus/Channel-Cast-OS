import { BarChart3, CalendarClock, Eye, Play, Radar, ShieldCheck, Upload, Wifi } from "lucide-react";

import { Band, CTABand, FAQList, FeatureCard, Steps } from "@/components/site/marketing";
import { HeroAnimated } from "@/components/site/hero";

export const metadata = { title: "How It Works · Channel Cast", description: "How motion-based audio advertising works — from detecting presence to playing the right spot and measuring every play." };

export default function HowItWorksPage() {
  return (
    <>
      <HeroAnimated
        variant="how"
        eyebrow="How it works"
        title={<>Presence in, the <span className="text-brand-strong">right message</span> out.</>}
        subtitle="A Channel Cast device senses when someone is nearby and plays the most relevant audio spot — then reports every play in real time."
        primary={{ label: "Set up a device", href: "/register" }}
        secondary={{ label: "View ad space", href: "/marketplace" }}
      />

      <Band eyebrow="The loop" title="Four steps, running continuously">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={Radar} title="Sense" body="A USB webcam (software vision) or PIR sensor detects presence at the space." />
          <FeatureCard icon={Play} title="Play" body="The device plays the scheduled spot, respecting play windows and cooldowns." />
          <FeatureCard icon={Eye} title="Match" body="On vision devices, the spot is matched to how many people are nearby." />
          <FeatureCard icon={BarChart3} title="Measure" body="Every play is reported live — motion vs scheduled, by device and audience." />
        </div>
      </Band>

      <Band eyebrow="Setup" title="Online in about a minute" muted>
        <Steps items={[
          { title: "Add the device", body: "Register it in the dashboard to get a claim code and a one-line install command." },
          { title: "Run one command", body: "Paste the command into PowerShell on the mini-PC — it installs and connects automatically." },
          { title: "Send audio & go", body: "Add spots from your library, set a schedule or motion mode, and it starts playing." },
        ]} />
      </Band>

      <Band eyebrow="Devices" title="Choose the sensing that fits">
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard icon={Eye} title="AI vision (USB webcam)" body="On-device computer vision counts who's present and enables audience-aware campaigns. Privacy-first — no images are stored or uploaded." />
          <FeatureCard icon={Radar} title="PIR motion sensor" body="A low-cost sensor triggers playback on any movement. Simple and inexpensive to deploy widely." />
        </div>
      </Band>

      <Band eyebrow="What you control" title="Full control from the dashboard" muted>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard icon={Upload} title="Content" body="Upload, record, and assign spots to any device or group." />
          <FeatureCard icon={CalendarClock} title="Scheduling" body="Play windows, cooldowns, and per-device deployments." />
          <FeatureCard icon={Wifi} title="Remote control" body="Volume, play/stop/next, power, and camera on/off — from anywhere." />
          <FeatureCard icon={ShieldCheck} title="Privacy" body="On-device sensing only; nothing about your visitors is stored." />
        </div>
      </Band>

      <Band eyebrow="FAQ" title="Common questions">
        <FAQList items={[
          ["What hardware is required?", "Any Windows mini-PC with a speaker, plus a USB webcam for motion/vision. Raspberry Pi support is on the roadmap."],
          ["Does it work offline?", "Devices need internet to receive schedules and report plays, but cache audio locally to keep playing."],
          ["Is my audience recorded?", "No. Vision runs on the device and produces only anonymous counts — never images or identities."],
          ["Can I run scheduled-only?", "Yes. Motion is optional; a device can simply loop spots on a schedule."],
        ]} />
      </Band>

      <CTABand title="See it in your space." subtitle="Set up a device or explore the marketplace." primary={{ label: "Get started", href: "/register" }} secondary={{ label: "Request a demo", href: "/request-demo" }} />
    </>
  );
}
