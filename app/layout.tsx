import type { Metadata } from "next";

import { ClerkProvider } from "@clerk/nextjs";

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

          <BizOpsNavShell>{children}</BizOpsNavShell>

        </body>

      </html>

    </ClerkProvider>

  );

}

import type { Metadata } from "next";

import { ClerkProvider } from "@clerk/nextjs";

import { SuiteOrgBinder } from "@/components/auth/suite-org-binder";
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

          <SuiteOrgBinder />
          <BizOpsNavShell>{children}</BizOpsNavShell>

        </body>

      </html>

    </ClerkProvider>

  );

}

