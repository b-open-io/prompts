import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
	subsets: ["latin"],
	weight: ["400", "500", "600"],
	variable: "--font-sans",
	display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-mono",
	display: "swap",
})

export const metadata: Metadata = {
	title: "bOpen Setup",
	description: "Playground UI for the bopen-setup harness installer.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="en"
			className={`${inter.variable} ${jetbrainsMono.variable} dark`}
			suppressHydrationWarning
		>
			<body className="antialiased">{children}</body>
		</html>
	)
}
