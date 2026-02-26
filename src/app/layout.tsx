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
  title: {
    default: "Open Poker - 포커 커뮤니티",
    template: "%s - Open Poker",
  },
  description:
    "포커를 배우고, 공유하고, 성장하세요. 전략 공유, 핸드 분석, 실시간 포인트 포커, 커뮤니티를 한곳에서.",
  keywords: [
    "포커",
    "텍사스 홀덤",
    "포커 커뮤니티",
    "포커 전략",
    "핸드 분석",
    "포커 뉴스",
    "홀덤",
    "poker",
    "texas holdem",
    "poker community",
  ],
  authors: [{ name: "Open Poker" }],
  creator: "Open Poker",
  metadataBase: new URL("https://pokerhub-eight.vercel.app"),
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://pokerhub-eight.vercel.app",
    siteName: "Open Poker",
    title: "Open Poker - 포커 커뮤니티",
    description:
      "포커를 배우고, 공유하고, 성장하세요. 전략 공유, 핸드 분석, 실시간 포인트 포커, 커뮤니티를 한곳에서.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Open Poker - 포커 커뮤니티",
    description:
      "포커를 배우고, 공유하고, 성장하세요. 전략 공유, 핸드 분석, 실시간 포인트 포커.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
              var t = localStorage.getItem('openpoker-theme');
              if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            })();
          `,
        }} />
      </head>
      <body className={`${inter.variable} antialiased bg-op-bg text-op-text min-h-screen flex flex-col text-[15px] md:text-[16px]`}>
        <SessionProvider session={session}>
          <ThemeProvider>
            <ChatProvider>
              <Header />

              <div className="flex-1 mx-auto w-full max-w-[1560px] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
                <div className="flex gap-3 sm:gap-4 lg:gap-6">
                  {/* Main Content */}
                  <main className="flex-1 min-w-0">
                    {children}
                  </main>

                  {/* Sidebar - Hidden on mobile, sticky */}
                  <div className="hidden lg:block w-[300px] flex-shrink-0">
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto scrollbar-thin">
                      <SidebarServer />
                    </div>
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
