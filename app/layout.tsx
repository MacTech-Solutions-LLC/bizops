import type { Metadata } from "next";

import { ClerkProvider } from "@clerk/nextjs";

import { ClerkOrgBootstrap } from "@/components/auth/clerk-org-bootstrap";
import { BizOpsNavShell } from "@/components/ui/bizops-nav-shell";

import { APP_NAME } from "@/lib/constants";

import "./globals.css";



export const metadata: Metadata = {

  title: APP_NAME,

  description: "MacTech Suite BizOps — company and business management",

};



export default function RootLayout({ children }: { children: React.ReactNode }) {

  return (

    <ClerkProvider>

      <html lang="en">

        <body data-mt-mood="vivid">

          <ClerkOrgBootstrap />
          <BizOpsNavShell>{children}</BizOpsNavShell>

        </body>

      </html>

    </ClerkProvider>

  );

}

