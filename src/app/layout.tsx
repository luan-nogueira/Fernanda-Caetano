import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fernanda Caetano | Enfermeira Dermatológica e Esteta",
    template: "%s | Fernanda Caetano",
  },
  description:
    "Especialista em Feridas, Laserterapia e Estética Avançada. Agendamento online para Farol de São Thomé, Edifício Platinum e Home Care.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${inter.variable}`}>
      <body className="font-sans min-h-screen flex flex-col bg-offwhite text-navy antialiased selection:bg-terracotta/20 selection:text-navy">
        {children}
      </body>
    </html>
  );
}

