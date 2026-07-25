/**
 * Update checking for the Agent Master desktop shell.
 *
 * This playground is one unit with two hosts: the packaged desktop app spawns
 * it as a broker, and `skills/setup/scripts/*` serves the same code with no app
 * installed at all. Only the desktop host can be updated, and it identifies
 * itself by handing the broker AGENT_MASTER_APP_VERSION and the bundle path it
 * was launched from. Absent either, every entry point here reports "unsupported"
 * and the UI shows nothing — a standalone setup session must never offer to
 * replace an application it is not part of.
 */

export type UpdateChannel = "production" | "internal"

export type UpdateCheck =
	| { state: "unsupported"; reason: string }
	| { state: "current"; installed: string; channel: UpdateChannel }
	| {
			state: "available"
			installed: string
			latest: string
			channel: UpdateChannel
			filename: string
	  }
	| { state: "unreachable"; installed: string; channel: UpdateChannel; reason: string }

/** The subset of `process.env` this module reads, kept assignable from it. */
export type UpdateEnvironment = {
	[key: string]: string | undefined
	AGENT_MASTER_APP_VERSION?: string
	AGENT_MASTER_APP_BUNDLE?: string
	AGENT_MASTER_APP_PID?: string
	AGENT_MASTER_UPDATE_FEED?: string
	BOPEN_AGENT_MASTER?: string
}

type FeedResponse = {
	channel?: string
	latest?: { version?: string; channel?: string; filename?: string } | null
	updateAvailable?: boolean | null
}

export const DEFAULT_UPDATE_FEED = "https://bopen.ai/api/releases/agent-master/latest"

const INTERNAL_SUFFIX = /-internal\.\d+$/

/** The desktop shell this broker belongs to, or null when running standalone. */
export function desktopHost(env: UpdateEnvironment): {
	version: string
	bundle: string
	pid: number
} | null {
	if (env.BOPEN_AGENT_MASTER !== "1") return null
	const version = env.AGENT_MASTER_APP_VERSION?.trim()
	const bundle = env.AGENT_MASTER_APP_BUNDLE?.trim()
	const pid = Number(env.AGENT_MASTER_APP_PID?.trim())
	if (!version || !bundle || !Number.isInteger(pid) || pid <= 0) return null
	return { version, bundle, pid }
}

/** An internal build checks the internal channel; releases never see prereleases. */
export function channelFor(version: string): UpdateChannel {
	return INTERNAL_SUFFIX.test(version) ? "internal" : "production"
}

export function feedUrl(installed: string, channel: UpdateChannel, env: UpdateEnvironment): string {
	const url = new URL(env.AGENT_MASTER_UPDATE_FEED?.trim() || DEFAULT_UPDATE_FEED)
	url.searchParams.set("version", installed)
	url.searchParams.set("channel", channel)
	return url.toString()
}

export async function checkForUpdate(options: {
	env: UpdateEnvironment
	fetchImpl?: typeof fetch
}): Promise<UpdateCheck> {
	const host = desktopHost(options.env)
	if (!host) {
		return {
			state: "unsupported",
			reason: "This setup session is not running inside the Agent Master desktop app.",
		}
	}

	const channel = channelFor(host.version)
	const request = options.fetchImpl ?? fetch
	let payload: FeedResponse
	try {
		const response = await request(feedUrl(host.version, channel, options.env), {
			cache: "no-store",
			headers: { Accept: "application/json" },
		})
		if (!response.ok) {
			return {
				state: "unreachable",
				installed: host.version,
				channel,
				reason: `The release feed answered ${response.status}.`,
			}
		}
		payload = (await response.json()) as FeedResponse
	} catch (error) {
		return {
			state: "unreachable",
			installed: host.version,
			channel,
			reason: error instanceof Error ? error.message : String(error),
		}
	}

	const latest = payload.latest
	if (!payload.updateAvailable || !latest?.version || !latest.filename) {
		return { state: "current", installed: host.version, channel }
	}
	return {
		state: "available",
		installed: host.version,
		latest: latest.version,
		channel,
		filename: latest.filename,
	}
}
