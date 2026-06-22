import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
 title: "ResumeAI",
 description: "AI Resume Builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return (
   <html lang="en">
     <body className={`${inter.className} text-gray-900 bg-gray-50`}>
       <AuthProvider>{children}</AuthProvider>
     </body>
   </html>
 );
}