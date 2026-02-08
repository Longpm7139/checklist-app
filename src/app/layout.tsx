import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as requested for modern look
import "./globals.css";
import { UserProvider } from "@/providers/UserProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Checklist App",
  description: "Passenger Boarding Bridge Checklist Application",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
