type NativeSdkApi = {
	credentials: {
		set(options: { service: string; account: string; secret: string }): Promise<boolean>
		get(options: { service: string; account: string }): Promise<string | null>
		delete(options: { service: string; account: string }): Promise<boolean>
	}
	os: { openUrl(value: string | { url: string }): Promise<boolean> }
	platform: { supports(value: string | { feature: string }): Promise<boolean> }
}

declare global {
	interface Window {
		zero?: NativeSdkApi
	}
}

const SESSION_KEY = {
	service: "ai.bopen.agent-master",
	account: "bopen.ai-device-session",
} as const

function api(): NativeSdkApi {
	if (!window.zero) throw new Error("Native SDK bridge is unavailable")
	return window.zero
}

export async function supportsCredentialStore(): Promise<boolean> {
	if (!window.zero) return false
	try {
		return await window.zero.platform.supports("credentials")
	} catch {
		return false
	}
}

export async function loadSessionToken(): Promise<string | null> {
	return api().credentials.get(SESSION_KEY)
}

export async function storeSessionToken(token: string): Promise<void> {
	if (!token) throw new Error("Refusing to store an empty session token")
	const stored = await api().credentials.set({ ...SESSION_KEY, secret: token })
	if (!stored) throw new Error("The OS credential store refused the session token")
}

export async function deleteSessionToken(): Promise<void> {
	await api().credentials.delete(SESSION_KEY)
}

export async function openExternalUrl(url: string): Promise<void> {
	if (!url.startsWith("https://bopen.ai/")) throw new Error("External URL is not allowlisted")
	if (window.zero) {
		const opened = await window.zero.os.openUrl(url)
		if (!opened) throw new Error("The system browser could not be opened")
		return
	}
	window.open(url, "_blank", "noopener,noreferrer")
}
