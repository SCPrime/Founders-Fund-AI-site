import type { Metadata } from "next";
import "./globals.css";
import AuthContext from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Founders Fund Calculator",
  description: "React conversion of Founders Fund calculator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthContext>{children}</AuthContext>
      </body>
    </html>
  );
}
