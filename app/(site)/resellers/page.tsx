import { Briefcase, LineChart, Percent, Rocket, Users, Wallet } from "lucide-react";

import { SolutionPage } from "@/components/site/marketing";

export const metadata = { title: "For Resellers · Channel Cast", description: "Sell Channel Cast campaigns and ad space in your market and earn on every booking." };

export default function ResellersPage() {
  return (
    <SolutionPage
      hero={{ eyebrow: "For resellers", title: "Sell audio advertising in your market.", subtitle: "Bring advertisers and ad spaces onto Channel Cast, manage their campaigns from one place, and earn on every deal.", primary: { label: "Become a reseller", href: "/register" }, secondary: { label: "Talk to us", href: "/contact" } }}
      valueTitle="Built for resellers"
      values={[
        { icon: Percent, title: "Earn on every booking", body: "Commission on the campaigns and inventory you bring to the network." },
        { icon: Users, title: "Manage your accounts", body: "Advertisers, spaces, and campaigns organized under your book of business." },
        { icon: Briefcase, title: "Agency-ready", body: "Run multi-space campaigns for clients with clear reporting." },
        { icon: Wallet, title: "Transparent payouts", body: "See what you've earned and what's pending, updated as deals close." },
        { icon: LineChart, title: "Performance you can show", body: "Play and reach reports to prove value to your clients." },
        { icon: Rocket, title: "Scale across markets", body: "Add regions and locations without changing tools." },
      ]}
      stepsTitle="Start reselling"
      steps={[
        { title: "Sign up", body: "Create your reseller account and tell us your target market." },
        { title: "Onboard accounts", body: "Bring advertisers and ad spaces into the platform." },
        { title: "Book & earn", body: "Launch campaigns and earn on every booking you close." },
      ]}
      faq={[
        ["Is there a fee to start?", "Reach out — terms depend on your market and volume."],
        ["Can I white-label?", "White-label and agency options are available for qualified resellers."],
        ["Who handles billing?", "The platform tracks bookings and plays; payout terms are set per agreement."],
        ["What support do I get?", "Onboarding help, reporting tools, and a shared dashboard for your accounts."],
      ]}
      cta={{ title: "Own audio advertising in your region.", primary: { label: "Become a reseller", href: "/register" }, secondary: { label: "Contact sales", href: "/contact" } }}
    />
  );
}
