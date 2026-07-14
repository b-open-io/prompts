import type { Metadata } from "next"
import { GameShellProvider } from "@/components/game-shell"
import { SoundProvider } from "@/components/SoundProvider"
import "./globals.css"

export const metadata: Metadata = {
	title: "bOpen Setup",
	description: "Playground UI for the bopen-setup harness installer.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<SoundProvider>
					<GameShellProvider>{children}</GameShellProvider>
				</SoundProvider>
			</body>
		</html>
	)
}
