import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wona · Livrer en confiance",
  description:
    "Wona connecte vendeurs et livreurs à Lomé pour des livraisons simples, rapides et suivies.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Wona · Livrer en confiance",
    description: "Publiez, suivez et livrez vos colis à Lomé avec Wona.",
    images: ["/wona-social.png"],
    locale: "fr_TG",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
