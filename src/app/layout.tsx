import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SidebarServer from "@/components/layout/SidebarServer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Toaster } from "sonner";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { MobileChatDrawer } from "@/components/chat/MobileChatDrawer";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { getSession } from "@/lib/auth/session";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "PokerHub - 포커 커뮤니티",
  description: "포커를 배우고, 공유하고, 성장하세요",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var t = localStorage.getItem('pokerhub-theme');
              if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            })();
          `,
        }} />
      </head>
      <body className={`${inter.variable} antialiased bg-ph-bg text-ph-text min-h-screen flex flex-col`}>
        <SessionProvider session={session}>
          <ThemeProvider>
            <ChatProvider>
              <Header />

              <div className="flex-1 mx-auto w-full max-w-[1560px] px-4 py-6">
                <div className="flex gap-6">
                  {/* Main Content */}
                  <main className="flex-1 min-w-0">
                    {children}
                  </main>

                  {/* Sidebar - Hidden on mobile */}
                  <div className="hidden lg:block w-[300px] flex-shrink-0">
                    <SidebarServer />
                  </div>
                </div>
              </div>

              <Footer />
              <MobileBottomNav />
              <MobileChatDrawer />
              <Toaster position="top-center" theme="system" />
            </ChatProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
