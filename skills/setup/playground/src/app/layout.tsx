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
			<head>
				{/* Inside the Agent Master shell the WebView is transparent and the
				    native splash sits beneath it. Marking the root before first paint
				    keeps the canvas clear so the page can fade in over the splash. */}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static, no user input
					dangerouslySetInnerHTML={{
						__html:
							'try{if(new URLSearchParams(location.search).get("shell")==="agent-master"||localStorage.getItem("bopen-setup-shell")==="agent-master"){document.documentElement.dataset.shell="agent-master"}}catch(e){}',
					}}
				/>
			</head>
			<body className="antialiased">
				<SoundProvider>
					<GameShellProvider>{children}</GameShellProvider>
				</SoundProvider>
			</body>
		</html>
	)
}
