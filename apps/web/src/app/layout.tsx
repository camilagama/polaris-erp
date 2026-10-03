import { Toaster } from "@polaris/ui/components/ui/sonner";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { type ReactNode, Suspense } from "react";
import "./globals.css";
import { TooltipProvider } from "@polaris/ui/components/ui/tooltip";
import { cn } from "@polaris/ui/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polaris",
  description:
    "Operacao web para revenda com autenticacao, produtos, estoque e configuracoes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable
      )}
      lang="pt-BR"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <Toaster position="top-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
