import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SuiteOrgBinder } from "@/components/auth/suite-org-binder";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_SUBTITLE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" data-mt-mood="quiet">
        <body>
          <SuiteOrgBinder />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
