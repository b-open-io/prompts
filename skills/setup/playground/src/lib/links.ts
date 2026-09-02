// Ported from skills/setup/assets/ui.html's link helpers — bopen.ai
// link-outs for plugins and skills.

/** Skill names printed from manifest data are kebab-case slugs; prose like
 *  "many scripts" must stay plain text rather than link to a bogus URL. */
const SKILL_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function pluginBopenUrl(name: string): string {
	return `https://bopen.ai/plugins/${name}`
}

export function skillBopenUrl(pluginName: string, skillName: string): string {
	return `https://bopen.ai/skills/${pluginName}/${skillName}`
}

export function isSkillSlug(skillName: string): boolean {
	return SKILL_SLUG_RE.test(skillName)
}

export function pluginInstallCommand(
	name: string,
	runtime: string,
	marketplace: string | null,
): string | null {
	if (!marketplace) return null
	if (runtime === "claude") return `claude plugin install ${name}@${marketplace}`
	if (runtime === "codex") return `codex plugin add ${name}@${marketplace}`
	return null
}

export function pluginUpdateCommand(
	name: string,
	runtime: "claude" | "codex",
	marketplace: string | null,
): string | null {
	if (!marketplace) return null
	if (runtime === "claude") return `claude plugin update ${name}@${marketplace}`
	return `codex plugin marketplace upgrade && codex plugin add ${name}@${marketplace}`
}
