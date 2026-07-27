import { redirect } from "next/navigation";

// The public marketing site lands here in a later phase. For now the root
// opens the authenticated console so the dashboard foundation is front and center.
export default function RootPage() {
  redirect("/app/admin");
}
