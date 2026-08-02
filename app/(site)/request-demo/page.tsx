import { PageHero } from "@/components/site/marketing";
import { LeadForm } from "@/components/site/lead-form";

export const metadata = { title: "Request a Demo · Channel Cast", description: "See Channel Cast in action — request a personalized demo." };

export default function RequestDemoPage() {
  return (
    <>
      <PageHero eyebrow="Request a demo" title="See Channel Cast in action." subtitle="Tell us a bit about your spaces or campaigns and we'll walk you through a live demo." />
      <section>
        <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6"><LeadForm kind="demo" /></div>
      </section>
    </>
  );
}
