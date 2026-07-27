import { redirect } from "next/navigation";

// Role-aware entry point. Real role resolution arrives with Supabase auth;
// for now the Super Admin console is the default landing surface.
export default function AppIndexPage() {
  redirect("/app/admin");
}
