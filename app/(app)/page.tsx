import { redirect } from "next/navigation";

/** The workspace root redirects to the dashboard. */
export default function WorkspaceIndex() {
  redirect("/dashboard");
}
