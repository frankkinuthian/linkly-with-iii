import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import "fumadocs-ui/css/neutral.css";
import "fumadocs-ui/css/preset.css";

export const metadata = {
  title: "Linkly Docs",
  description: "Documentation and API reference for Linkly",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
