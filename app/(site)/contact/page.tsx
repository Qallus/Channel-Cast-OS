import { PageHero } from "@/components/site/marketing";
import { LeadForm } from "@/components/site/lead-form";

export const metadata = { title: "Contact · Channel Cast", description: "Get in touch with the Channel Cast team." };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's talk." subtitle="Questions about advertising, hosting a device, or partnering? Send us a note and we'll get back to you." />
      <section>
        <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6"><LeadForm kind="contact" /></div>
      </section>
    </>
  );
}
