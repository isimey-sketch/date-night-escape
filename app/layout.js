export const metadata = {
  title: "Date Night Escape",
  description: "Realistic outings for solo dates, couples, friends and families.",
  manifest: "/manifest.json",
  themeColor: "#10130f"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
