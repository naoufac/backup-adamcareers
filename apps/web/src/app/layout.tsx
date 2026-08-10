import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "AdamCareers — Canadian Resume Builder & Cover Letter AI",
  description:
    "Adam adapte votre CV et votre lettre d'accompagnement a chaque offre d'emploi canadienne en 2 minutes. Constructeur de CV canadien, scores ATS en temps reel, bilingue FR/EN.",
  keywords: [
    "CV canadien", "resume Canada", "lettre de motivation",
    "ATS", "adaptation CV", "candidature Quebec",
  ],
  openGraph: {
    title: "AdamCareers",
    description: "Votre candidature canadienne, adaptee en 2 minutes.",
    locale: "fr_CA",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
