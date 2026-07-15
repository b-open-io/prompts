// Generated from bopen.ai content/packs ToCs + pack.json manifests on 2026-07-14.
// Keep this snapshot aligned with the release manifests delivered to pack buyers.

export type PlaybookClass = "blueprint" | "feature" | "task" | "chain" | "foundation"

export type PackPlugin = {
	name: string
	marketplace: string
	install: string
}

export type PackPlaybook = {
	id: string
	title: string
	class: PlaybookClass
	summary: string
	skills: string[]
	agents: string[]
	sample: boolean
}

export type PackCatalogEntry = {
	slug: string
	productId: string
	name: string
	tagline: string
	plugins: PackPlugin[]
	playbooks: PackPlaybook[]
}

export const PLAYBOOK_CLASSES = [
	{
		key: "blueprint",
		label: "BLUEPRINT",
		plural: "blueprints",
		glyph: "◆",
		color: "#e38f1a",
		meaning: "An entire product rollout — coordinated agent waves from scaffold to ship.",
	},
	{
		key: "feature",
		label: "FEATURE",
		plural: "features",
		glyph: "▲",
		color: "#34d399",
		meaning: "One complex feature shipped into an existing product, exact toolkit path included.",
	},
	{
		key: "task",
		label: "TASK",
		plural: "tasks",
		glyph: "●",
		color: "#8cb4cb",
		meaning: "A bounded single-session job — one agent, one sitting, done.",
	},
	{
		key: "chain",
		label: "CHAIN",
		plural: "chains",
		glyph: "⧉",
		color: "#a78bfa",
		meaning: "A multi-agent workflow sequence with named-agent handoffs.",
	},
	{
		key: "foundation",
		label: "FOUNDATION",
		plural: "foundations",
		glyph: "■",
		color: "#d6c7a1",
		meaning: "Fill-in-the-blank onboarding docs that train the staff on your business.",
	},
] as const

export const PACK_CATALOG = [
	{
		slug: "design-brand",
		productId: "pack-design-brand",
		name: "Design & Brand",
		tagline: "Brand systems, UI, and visual content that ships.",
		plugins: [
			{
				name: "gemskills",
				marketplace: "b-open-io",
				install: "claude plugin install gemskills@b-open-io",
			},
			{
				name: "bopen-tools",
				marketplace: "b-open-io",
				install: "claude plugin install bopen-tools@b-open-io",
			},
			{
				name: "shadcn",
				marketplace: "portable-skill",
				install: "npx skills add shadcn (source pinned in the pack setup manifest)",
			},
			{
				name: "frontend-design",
				marketplace: "claude-plugins-official",
				install: "claude plugin install frontend-design@claude-plugins-official",
			},
			{
				name: "web-design-guidelines",
				marketplace: "portable-skill",
				install: "npx skills add web-design-guidelines (source pinned in the pack setup manifest)",
			},
			{
				name: "vercel-react-best-practices",
				marketplace: "portable-skill",
				install:
					"npx skills add vercel-react-best-practices (source pinned in the pack setup manifest)",
			},
			{
				name: "macos-design",
				marketplace: "portable-skill",
				install: "npx skills add macos-design (source pinned in the pack setup manifest)",
			},
			{
				name: "accessibility-a11y",
				marketplace: "portable-skill",
				install: "npx skills add accessibility-a11y (source pinned in the pack setup manifest)",
			},
			{
				name: "product-skills",
				marketplace: "b-open-io",
				install: "claude plugin install product-skills@b-open-io",
			},
		],
		playbooks: [
			{
				id: "db-brand-identity-system",
				title: "Roll out a complete brand identity system in one engagement",
				class: "blueprint",
				summary:
					"Coordinates Lisa and Ridd through a full identity build: a logo family, a locked color and type system, a reusable art style, and a templated asset kit exported to print-ready collateral. Flow captures the voice sheet alongside, so the brand ships as one coherent system where every asset traces back to the same locked color, type, and style specs.",
				skills: [
					"gemskills:style-creator",
					"gemskills:generate-image",
					"gemskills:generate-svg",
					"bopen-tools:html-to-pdf",
				],
				agents: ["Ridd", "Lisa", "Flow"],
				sample: false,
			},
			{
				id: "db-marketing-site-design-system",
				title: "Ship a marketing site backed by a documented, drift-proof design system",
				class: "blueprint",
				summary:
					"Ridd and Theo build a full marketing site on a single token-based shadcn system, Torque keeps Core Web Vitals clean, and every release passes through a visual-diff recap so the site and its design system never drift apart. Addresses the top 2026 AI-design failure mode where docs, tokens, and components each say something different.",
				skills: [
					"shadcn",
					"frontend-design",
					"web-design-guidelines",
					"vercel-react-best-practices",
					"bopen-tools:frontend-performance",
					"bopen-tools:visual-review",
				],
				agents: ["Ridd", "Theo", "Torque"],
				sample: false,
			},
			{
				id: "db-launch-visual-campaign",
				title: "Produce an entire product-launch visual campaign from one brand lock",
				class: "blueprint",
				summary:
					"Caal frames the launch, then Ridd, Lisa, and Frames generate the landing imagery, pitch deck, social batch, and a demo GIF or video — all against one locked style so nothing looks like it came from a different tool. Turns a launch from a scramble of ad-hoc prompts into a governed, on-brand asset run.",
				skills: [
					"gemskills:deck-creator",
					"gemskills:generate-image",
					"gemskills:generate-video",
					"gemskills:section-dividers",
					"bopen-tools:cli-demo-gif",
				],
				agents: ["Caal", "Ridd", "Lisa", "Frames"],
				sample: false,
			},
			{
				id: "db-native-desktop-ui",
				title: "Give a desktop app a native-feeling UI, icons, and sound",
				class: "blueprint",
				summary:
					"Ridd, Kris, and Frames build out a desktop app's interface with native macOS conventions — sidebar, traffic lights, light/dark — a full icon set at every required size, and a coordinated UI sound identity. The app stops feeling like a website in a window.",
				skills: [
					"macos-design",
					"gemskills:generate-icon",
					"gemskills:generate-svg",
					"vercel-react-best-practices",
					"bopen-tools:ui-audio-theme",
				],
				agents: ["Ridd", "Kris", "Frames"],
				sample: false,
			},
			{
				id: "db-design-tokens",
				title: "Replace hardcoded values with a token system, proven by a visual diff",
				class: "feature",
				summary:
					"Ridd and Theo migrate an existing codebase off scattered hardcoded colors, spacing, and type onto a single shadcn token source of truth, then use a visual-diff recap to prove no screen regressed. Kills the drift between what the design says and what the code renders.",
				skills: ["shadcn", "web-design-guidelines", "frontend-design", "bopen-tools:visual-review"],
				agents: ["Ridd", "Theo"],
				sample: false,
			},
			{
				id: "db-theme-aware-ui",
				title: "Make every screen, chart, and sound cue respect system theme",
				class: "feature",
				summary:
					"Ridd and Theo sweep an app so nothing hard-codes a color: every surface, data-viz palette, and interaction sound flips correctly between light and dark. The theme stops being a half-finished afterthought.",
				skills: ["web-design-guidelines", "frontend-design", "bopen-tools:ui-audio-theme"],
				agents: ["Ridd", "Theo"],
				sample: false,
			},
			{
				id: "db-webgl-hero",
				title: "Add a 3D/WebGL hero that doesn't tank Core Web Vitals",
				class: "feature",
				summary:
					"Kris builds an animated 3D centerpiece with real shaders and Torque tunes it so the flashy hero ships without wrecking load performance on mobile. A showcase moment that survives a Lighthouse run.",
				skills: [
					"bopen-tools:threejs-r3f",
					"bopen-tools:shaders",
					"bopen-tools:frontend-performance",
				],
				agents: ["Kris", "Torque"],
				sample: false,
			},
			{
				id: "db-generative-ui-dashboard",
				title: "Build a dashboard the AI composes from live data",
				class: "feature",
				summary:
					"Ridd and Theo wire a generative-UI surface so the product renders dashboards and forms from model output safely, giving each user a layout that adapts to the data they actually have in front of them.",
				skills: ["bopen-tools:generative-ui", "bopen-tools:mcp-apps", "shadcn"],
				agents: ["Ridd", "Theo"],
				sample: false,
			},
			{
				id: "db-ui-audio-theme",
				title: "Give an app one cohesive, on-brand sound identity",
				class: "feature",
				summary:
					"Frames and Ridd map an app's clicks, notifications, navigation, and error states to one coordinated sound set tied to interaction constants, so the audio feels composed as a single identity — a rarely-done polish layer that makes a product feel expensive.",
				skills: ["bopen-tools:ui-audio-theme"],
				agents: ["Frames", "Ridd"],
				sample: false,
			},
			{
				id: "db-accessible-components",
				title: "Harden a component library to pass contrast and focus audits",
				class: "feature",
				summary:
					"Ridd audits an existing component set for contrast, focus states, and ARIA gaps and delivers fixes as a punch list plus patches, with a visual diff proving nothing changed visually for sighted users. Closes the accessibility gaps most AI-generated UI ships with.",
				skills: ["accessibility-a11y", "web-design-guidelines", "frontend-design"],
				agents: ["Ridd"],
				sample: false,
			},
			{
				id: "db-analytics-dataviz",
				title: "Add a metrics dashboard with correct chart types and accessible color",
				class: "feature",
				summary:
					"Ridd and Theo build an analytics surface that picks the right chart for each metric, encodes categories with an accessible palette, and stays readable in both themes. No more pie charts where a bar chart belonged.",
				skills: ["bopen-tools:charting", "shadcn", "web-design-guidelines"],
				agents: ["Ridd", "Theo"],
				sample: false,
			},
			{
				id: "db-print-collateral-feature",
				title: "Let the product generate on-brand printable collateral on demand",
				class: "feature",
				summary:
					"Ridd wires an HTML-to-PDF pipeline into the product so it can emit print-ready, on-brand collateral — certificates, one-pagers, receipts, invoices — on demand, so generating a printable document becomes something the app does for itself at runtime.",
				skills: ["bopen-tools:html-to-pdf", "gemskills:generate-svg"],
				agents: ["Ridd"],
				sample: false,
			},
			{
				id: "db-logo-concepts",
				title: "Get a shortlist of distinct, on-brief logo directions in one sitting",
				class: "task",
				summary:
					"Lisa and Ridd generate a spread of stylistically distinct logo concepts from a creative brief, browsing the style library so each option explores a distinct visual direction you can react to and narrow down in the same sitting.",
				skills: [
					"gemskills:generate-image",
					"gemskills:generate-svg",
					"gemskills:style-creator",
					"gemskills:browsing-styles",
				],
				agents: ["Lisa", "Ridd"],
				sample: false,
			},
			{
				id: "db-app-icons",
				title: "Export a full app-icon and favicon set at every platform size",
				class: "task",
				summary:
					"Lisa generates and exports every icon size and format a product needs — iOS, Android, PWA, macOS, Windows, App Store, Play Store — already optimized, so nothing is left to hand-resize the night before submission. A single-session job that usually eats an afternoon of fiddling.",
				skills: ["gemskills:generate-icon", "gemskills:optimize-images"],
				agents: ["Lisa"],
				sample: true,
			},
			{
				id: "db-social-asset-batch",
				title: "Produce a week of on-brand, platform-sized social assets at once",
				class: "task",
				summary:
					"Lisa batches a week's worth of social posts against a locked style and correct per-platform dimensions, so a full week of assets lands on-brand and correctly sized in one governed pass you can schedule out immediately.",
				skills: [
					"gemskills:generate-image",
					"gemskills:section-dividers",
					"gemskills:optimize-images",
				],
				agents: ["Lisa"],
				sample: false,
			},
			{
				id: "db-pitch-deck",
				title: "Build a presentation-ready investor or sales deck",
				class: "task",
				summary:
					"Lisa runs the full deck pipeline — discovery, theme, copy, parallel slide generation, PDF stitch — to produce a narrative-structured, on-brand deck that is laid out and ready to present the moment it finishes.",
				skills: ["gemskills:deck-creator"],
				agents: ["Lisa"],
				sample: false,
			},
			{
				id: "db-svg-illustration-set",
				title: "Generate a cohesive SVG illustration set for a landing page",
				class: "task",
				summary:
					"Lisa produces a matched set of scalable illustrations locked to the brand style, so a landing page gets custom art where every piece reads as one visual family down to the line weight and palette.",
				skills: ["gemskills:generate-svg", "gemskills:edit-image"],
				agents: ["Lisa"],
				sample: false,
			},
			{
				id: "db-avatar-batch",
				title: "Generate a consistent avatar set for a team or agent roster",
				class: "task",
				summary:
					"Lisa produces same-style avatars for every team member or agent persona in one pass — portraits, pixel variants, group lineups, or icon crops — so an about page or roster reads as one intentional set built from a single style reference.",
				skills: [
					"gemskills:avatar-portrait",
					"gemskills:pixel-avatar",
					"gemskills:team-group-photo",
				],
				agents: ["Lisa"],
				sample: false,
			},
			{
				id: "db-image-optimization",
				title: "Compress and responsively size every image on a site",
				class: "task",
				summary:
					"Torque and Lisa optimize every image on the site — compression, correct sizing, responsive delivery, modern formats — cutting page weight with no layout change and no touch to application logic.",
				skills: ["gemskills:optimize-images", "bopen-tools:frontend-performance"],
				agents: ["Torque", "Lisa"],
				sample: false,
			},
			{
				id: "db-demo-gif",
				title: "Record a polished CLI or product-flow demo GIF",
				class: "task",
				summary:
					"Torque produces a clean, embeddable demo GIF of a terminal session or product flow, ready to drop into a README or landing page. The kind of asset that makes a tool look real in three seconds.",
				skills: ["bopen-tools:cli-demo-gif"],
				agents: ["Torque"],
				sample: false,
			},
			{
				id: "db-section-dividers",
				title: "Add visual rhythm to a long landing page without a redesign",
				class: "task",
				summary:
					"Ridd and Lisa run a section-divider and pacing pass so a long page gets breathing room and visual rhythm, fixing the wall-of-sections feel without touching the underlying content or layout.",
				skills: ["gemskills:section-dividers", "gemskills:browsing-styles"],
				agents: ["Ridd", "Lisa"],
				sample: false,
			},
			{
				id: "db-screenshot-cleanup",
				title: "Turn low-res or messy screenshots into publish-ready hero images",
				class: "task",
				summary:
					"Lisa upscales, cleans, and recomposes rough product screenshots into polished hero images, so the marketing site can show the real product without it looking like a phone photo of a monitor.",
				skills: ["gemskills:upscale-image", "gemskills:segment-image", "gemskills:edit-image"],
				agents: ["Lisa"],
				sample: false,
			},
			{
				id: "db-explainer-video",
				title: "Produce a short narrated explainer video for a feature launch",
				class: "task",
				summary:
					"Frames and Lisa generate a narrated feature video with a cloned or scripted voice track, ready for social or the homepage. A launch asset that used to require a video contractor.",
				skills: ["gemskills:generate-video", "bopen-tools:voice-clone"],
				agents: ["Frames", "Lisa"],
				sample: false,
			},
			{
				id: "db-custom-art-style",
				title: "Define a reusable art style so every future asset stays consistent",
				class: "task",
				summary:
					"Lisa captures a custom, reusable style reference once, so every subsequent generation, from images to social graphics, stays visually consistent. The single most effective defense against AI-homogenized, off-brand output.",
				skills: ["gemskills:style-creator", "gemskills:browsing-styles"],
				agents: ["Lisa"],
				sample: false,
			},
			{
				id: "db-pencil-mockup",
				title: "Turn a visual mockup into shipped component code in one session",
				class: "task",
				summary:
					"Ridd takes a Pencil.dev mockup and produces working shadcn component code from it, closing the design-to-code handoff without a manual re-build. The layout you drew is the layout that ships.",
				skills: ["shadcn", "frontend-design"],
				agents: ["Ridd"],
				sample: false,
			},
			{
				id: "db-print-onepager",
				title: "Design a print-ready business card or one-pager from brand assets",
				class: "task",
				summary:
					"Ridd generates print-ready collateral straight from the brand system — business cards, postcards, one-pagers — via an HTML-to-CSS print pipeline, no separate design tool required. Good for business cards and one-pagers; not a prepress substitute for packaging.",
				skills: ["bopen-tools:html-to-pdf", "gemskills:generate-svg"],
				agents: ["Ridd"],
				sample: false,
			},
			{
				id: "db-campaign-landing-chain",
				title: "Campaign landing page: research to copy to design to visuals",
				class: "chain",
				summary:
					"Caal researches positioning and writes the page, hands to Ridd for design, then to Lisa for on-brand imagery — three named handoffs that carry a launch page from AI-visibility research all the way to a shipped, fully imaged page you can keep editing.",
				skills: [
					"product-skills:ai-seo-optimization",
					"web-design-guidelines",
					"gemskills:generate-image",
				],
				agents: ["Caal", "Ridd", "Lisa"],
				sample: false,
			},
			{
				id: "db-brand-to-site-chain",
				title: "Brand system to reviewed, shipped site with full traceability",
				class: "chain",
				summary:
					"Flow documents the brand foundation, Ridd designs against a locked style, Theo ships it in shadcn, and every step is traceable from the voice-and-style docs down to the merged code. A new brand becomes a live site nobody has to reverse-engineer later.",
				skills: ["gemskills:style-creator", "shadcn", "bopen-tools:visual-review"],
				agents: ["Flow", "Ridd", "Theo"],
				sample: false,
			},
			{
				id: "db-3d-audio-polish-chain",
				title: "Flagship page: 3D hero, then sound identity, then UI polish",
				class: "chain",
				summary:
					"Kris builds a 3D centerpiece, Frames layers a coordinated sound identity, and Ridd does the final UI polish pass — a sequenced handoff where each stage builds on the last to produce a premium flagship page.",
				skills: ["bopen-tools:threejs-r3f", "bopen-tools:ui-audio-theme", "frontend-design"],
				agents: ["Kris", "Frames", "Ridd"],
				sample: false,
			},
			{
				id: "db-deck-video-social-chain",
				title: "One narrative, three deliverables: deck, narrated video, social cutdowns",
				class: "chain",
				summary:
					"Lisa builds a themed deck, Frames turns it into a narrated video, and Lisa cuts it down into social clips — one story reused across three formats without re-briefing anyone. The clearest demonstration of chained asset production paying for itself.",
				skills: ["gemskills:deck-creator", "gemskills:generate-video", "bopen-tools:voice-clone"],
				agents: ["Lisa", "Frames"],
				sample: true,
			},
			{
				id: "db-persona-avatar-chain",
				title: "Persona definition to art direction to consistent avatar batch",
				class: "chain",
				summary:
					"Flow defines the personas, Ridd sets art direction as a locked style, and Lisa generates every avatar from that one style, so new team or agent personas get consistent avatars traceable to a single documented reference.",
				skills: ["gemskills:style-creator", "gemskills:pixel-avatar", "gemskills:generate-icon"],
				agents: ["Flow", "Ridd", "Lisa"],
				sample: false,
			},
			{
				id: "db-brand-voice-sheet",
				title: "Brand voice sheet that trains every agent before a word ships",
				class: "foundation",
				summary:
					"A fill-in-the-blank voice document Flow authors so every staff member knows how the brand writes and sounds before producing any copy or asset. The de-AI-slop layer that keeps generated text on-brand from the first draft.",
				skills: ["bopen-tools:humanize"],
				agents: ["Flow"],
				sample: false,
			},
			{
				id: "db-visual-identity-spec",
				title: "Visual identity spec that makes on-brand unambiguous",
				class: "foundation",
				summary:
					"Ridd and Lisa lock logo usage, color tokens, type scale, imagery rules, and a reusable style reference into one document, so on-brand becomes a written spec any agent can generate against and any reviewer can check a new design against.",
				skills: ["gemskills:style-creator"],
				agents: ["Ridd", "Lisa"],
				sample: true,
			},
			{
				id: "db-asset-pipeline-manifest",
				title: "Asset pipeline manifest so generated assets need no cleanup",
				class: "foundation",
				summary:
					"Lisa documents export sizes, naming conventions, optimization settings, and storage paths, so every generated asset lands correctly named and sized with no manual tidying. The plumbing that makes batch generation actually usable.",
				skills: ["gemskills:optimize-images"],
				agents: ["Lisa"],
				sample: false,
			},
			{
				id: "db-design-token-manifest",
				title: "Design system token manifest as the single source of truth",
				class: "foundation",
				summary:
					"Ridd and Theo capture one authoritative shadcn token set so code and design can never drift apart — the top-cited 2026 AI-design failure mode. Every build and review playbook starts from this manifest as the one source both the UI and the CSS resolve against.",
				skills: ["shadcn", "web-design-guidelines"],
				agents: ["Ridd", "Theo"],
				sample: false,
			},
			{
				id: "db-native-app-profile",
				title: "Native app design profile documenting platform conventions to follow",
				class: "foundation",
				summary:
					"Ridd documents exactly which native macOS conventions a specific desktop app should honor, so the UI build starts from a concrete checklist of sidebar behavior, window controls, menu structure, and keyboard norms to follow.",
				skills: ["macos-design"],
				agents: ["Ridd"],
				sample: false,
			},
		],
	},
	{
		slug: "marketing-growth",
		productId: "pack-marketing-growth",
		name: "Marketing & Growth",
		tagline: "Positioning, launches, and content that converts.",
		plugins: [
			{
				name: "marketing-skills",
				marketplace: "coreyhaines31",
				install: "claude plugin install marketing-skills@coreyhaines31",
			},
			{
				name: "bopen-tools",
				marketplace: "b-open-io",
				install: "claude plugin install bopen-tools@b-open-io",
			},
			{
				name: "pm-go-to-market",
				marketplace: "pm-skills",
				install: "claude plugin install pm-go-to-market@pm-skills",
			},
			{
				name: "product-skills",
				marketplace: "b-open-io",
				install: "claude plugin install product-skills@b-open-io",
			},
			{
				name: "gemskills",
				marketplace: "b-open-io",
				install: "claude plugin install gemskills@b-open-io",
			},
			{
				name: "1sat",
				marketplace: "b-open-io",
				install: "claude plugin install 1sat@b-open-io",
			},
			{
				name: "bsv-skills",
				marketplace: "b-open-io",
				install: "claude plugin install bsv-skills@b-open-io",
			},
		],
		playbooks: [
			{
				id: "mg-product-launch",
				title: "Run a full product launch as a sequence of coordinated waves",
				class: "blueprint",
				summary:
					"Caal, Parker, Ridd, and Flow sequence a 4-6 week launch: positioning, then landing page and email, then social and ads, then directory and PR distribution, with a readiness audit before go-live. Every asset and wave has a named owner and a fixed slot in the sequence.",
				skills: [
					"marketing-skills:product-marketing",
					"marketing-skills:launch",
					"marketing-skills:copywriting",
					"marketing-skills:emails",
					"marketing-skills:social",
					"marketing-skills:directory-submissions",
					"bopen-tools:saas-launch-audit",
					"bopen-tools:humanize",
				],
				agents: ["Caal", "Parker", "Ridd", "Flow"],
				sample: false,
			},
			{
				id: "mg-fractional-cmo-plan",
				title: "Build a 90-day fractional-CMO growth plan mapped to your stage",
				class: "blueprint",
				summary:
					"Caal and Parker produce a full AARRR growth plan tuned to current team size and funding stage, backed by customer research and a running experiment backlog with growth loops, analytics, A/B testing, and reporting wired in. The result is an operating plan detailed enough to defend to a board and specific enough for the team to execute against next week.",
				skills: [
					"marketing-skills:marketing-plan",
					"marketing-skills:customer-research",
					"marketing-skills:product-marketing",
					"marketing-skills:marketing-loops",
					"marketing-skills:ab-testing",
					"marketing-skills:analytics",
					"pm-go-to-market:growth-loops",
				],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-seo-geo-engine",
				title: "Stand up an always-on SEO + GEO content engine",
				class: "blueprint",
				summary:
					"Caal and Parker run content clusters, programmatic pages, AI-citation optimization, and schema as an ongoing loop tuned for both Google and AI-answer engines, sequencing the audit with our own GEO skill before executing the broader third-party playbooks. GEO is the fastest-growing and most under-served channel in 2026, and getting cited by AI answer engines early compounds as those engines send more traffic.",
				skills: [
					"marketing-skills:content-strategy",
					"marketing-skills:seo-audit",
					"marketing-skills:programmatic-seo",
					"marketing-skills:ai-seo",
					"marketing-skills:schema",
					"marketing-skills:marketing-loops",
					"product-skills:ai-seo-optimization",
					"bopen-tools:geo-optimizer",
				],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-outbound-engine",
				title: "Build a B2B outbound engine from ICP to sales-ready queue",
				class: "blueprint",
				summary:
					"Caal and Parker define the ICP, build prospecting lists, draft cold-email sequences with deliverability guardrails, and wire the sales handoff and RevOps routing. The output is a qualified pipeline with deliverability protection baked into every send so the sequences land in the inbox.",
				skills: [
					"marketing-skills:product-marketing",
					"marketing-skills:prospecting",
					"marketing-skills:cold-email",
					"marketing-skills:sales-enablement",
					"marketing-skills:revops",
					"bopen-tools:humanize",
				],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-referral-program",
				title: "Design a referral or affiliate program end to end",
				class: "feature",
				summary:
					"Caal designs the incentive structure, tracking plan, launch copy, and payout logic for a word-of-mouth growth loop, with pricing math that keeps the unit economics positive as referrals scale.",
				skills: ["marketing-skills:referrals", "marketing-skills:pricing", "bopen-tools:humanize"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-paywall-redesign",
				title: "Rebuild the paywall around a validated value metric",
				class: "feature",
				summary:
					"Caal redesigns in-app upgrade and paywall screens around a real value metric and clearer framing, tightening the exact moment a free user decides whether to pay without touching the price itself.",
				skills: ["marketing-skills:paywalls", "marketing-skills:pricing", "marketing-skills:cro"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-onboarding-activation",
				title: "Redesign onboarding around a real activation moment",
				class: "feature",
				summary:
					"Caal maps the first-run experience to a genuine aha moment and cuts signup friction, so new users reach real value in the first session while their intent is still high.",
				skills: ["marketing-skills:onboarding", "marketing-skills:signup", "marketing-skills:cro"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-free-tool-leadgen",
				title: "Spec a free interactive tool as a lead-gen engine",
				class: "feature",
				summary:
					"Caal and Ridd scope a buildable free tool — calculator, grader, generator, benchmark — designed for backlinks and lead capture, specced and ready to hand to engineering as a durable top-of-funnel asset.",
				skills: [
					"marketing-skills:free-tools",
					"marketing-skills:copywriting",
					"gemskills:generate-image",
					"bopen-tools:humanize",
				],
				agents: ["Caal", "Ridd"],
				sample: false,
			},
			{
				id: "mg-churn-winback",
				title: "Build a cancellation flow with save offers and win-back",
				class: "feature",
				summary:
					"Caal designs a cancellation flow with save-offer logic and a follow-up win-back sequence, turning the exit into a retention surface that catches a share of leaving users and re-engages the rest weeks later.",
				skills: [
					"marketing-skills:churn-prevention",
					"marketing-skills:emails",
					"bopen-tools:humanize",
				],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-programmatic-seo-system",
				title: "Build a programmatic SEO page system at scale",
				class: "feature",
				summary:
					"Caal and Parker spec a template plus data pipeline for generating hundreds of targeted comparison or location pages with correct architecture and schema, so long-tail traffic scales without hand-writing every page.",
				skills: [
					"marketing-skills:programmatic-seo",
					"marketing-skills:site-architecture",
					"marketing-skills:schema",
				],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-community-growth",
				title: "Design a community-led growth and ambassador program",
				class: "feature",
				summary:
					"Caal and Ordi design an ambassador and advocate program for community-led growth, with Ordi grounding the mechanics against real BSV/1Sat community behavior. The program runs the community as a growth channel with its own incentives, cadence, advocate tiers, and referral hooks.",
				skills: [
					"marketing-skills:community-marketing",
					"marketing-skills:referrals",
					"bopen-tools:humanize",
				],
				agents: ["Caal", "Ordi"],
				sample: false,
			},
			{
				id: "mg-ai-visibility-layer",
				title: "Add a site-wide AI-search visibility layer",
				class: "feature",
				summary:
					"Caal and Parker run a full GEO/AEO pass — llms.txt, schema, machine-readable files, and citation-friendly structure — so the product gets cited correctly across ChatGPT, Perplexity, and AI Overviews, using our audit skills alongside the broader AI-SEO skill. Closes the early-mover AI-visibility gap.",
				skills: [
					"marketing-skills:ai-seo",
					"marketing-skills:schema",
					"product-skills:ai-seo-optimization",
					"bopen-tools:geo-optimizer",
				],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-cro-audit",
				title: "Audit a landing page for conversion in one session",
				class: "task",
				summary:
					"Caal runs a single-session CRO audit and returns prioritized, testable fixes ranked by expected impact, so you leave with a punch list you can ship this week and a clear read on which changes move conversion most.",
				skills: ["marketing-skills:cro"],
				agents: ["Caal"],
				sample: true,
			},
			{
				id: "mg-homepage-rewrite",
				title: "Rewrite a homepage so it reads like a person wrote it",
				class: "task",
				summary:
					"Caal rewrites the homepage and runs it through a de-AI pass so it lands with a real voice, clearing the slightly-flat corporate tone that audiences now pattern-match as AI slop and that Google's Helpful Content system quietly demotes.",
				skills: ["marketing-skills:copywriting", "bopen-tools:humanize"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-copy-sweep",
				title: "Run a copy-editing sweep across an existing site",
				class: "task",
				summary:
					"Caal tightens and de-clutters copy across an existing page set, fixing clarity, consistency, flow, and word choice without a full rewrite — the fast polish pass before a launch or a raise.",
				skills: ["marketing-skills:copy-editing", "bopen-tools:humanize"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-alternative-page",
				title: "Build a competitor X-vs-Y alternative page backed by research",
				class: "task",
				summary:
					"Caal and Parker produce a publish-ready comparison page grounded in real competitor research and profiling, capturing high-intent bottom-of-funnel search with claims that hold up because they're sourced from actual product behavior.",
				skills: [
					"marketing-skills:competitors",
					"marketing-skills:competitor-profiling",
					"bopen-tools:humanize",
				],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-technical-seo-audit",
				title: "Run a technical SEO audit on ranking drops and crawl issues",
				class: "task",
				summary:
					"Parker returns a diagnostic report on ranking drops, crawl errors, indexing problems, and site-speed regressions, so a traffic dip turns into a prioritized fix list with the likely cause named for each.",
				skills: ["marketing-skills:seo-audit"],
				agents: ["Parker"],
				sample: false,
			},
			{
				id: "mg-schema-pass",
				title: "Add JSON-LD schema markup across key pages",
				class: "task",
				summary:
					"Caal implements structured data for rich results across the pages that matter, improving how the site renders in search and how AI engines parse it. A concrete, verifiable technical win.",
				skills: ["marketing-skills:schema"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-welcome-sequence",
				title: "Draft a ready-to-load 5-email welcome sequence",
				class: "task",
				summary:
					"Caal drafts a full welcome drip run through a de-AI pass, sequenced and ready to load into your ESP. Each email arrives with its trigger and send timing set and reads like a person wrote it.",
				skills: ["marketing-skills:emails", "bopen-tools:humanize"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-cold-email-campaign",
				title: "Draft a cold-email sequence with deliverability guardrails",
				class: "task",
				summary:
					"Caal writes the sequence and its follow-ups with an explicit send-cadence and deliverability warning baked in, since AI-drafted cold email gets spam-flagged at more than twice the human rate. Copy plus the guardrail that keeps it in the inbox.",
				skills: ["marketing-skills:cold-email", "bopen-tools:humanize"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-pricing-audit",
				title: "Audit a pricing page and set up a willingness-to-pay test",
				class: "task",
				summary:
					"Caal critiques the pricing page and delivers a Van Westendorp survey ready to run, so the next pricing decision rests on willingness-to-pay data collected from real customers.",
				skills: ["marketing-skills:pricing"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-ad-creative-batch",
				title: "Generate a batch of ad-creative variants for testing",
				class: "task",
				summary:
					"Caal and Ridd produce ten-plus platform-specific ad headlines, hooks, primary text, and matching visuals ready to load into a test, so the creative pipeline stops being the bottleneck on paid experiments.",
				skills: [
					"marketing-skills:ad-creative",
					"gemskills:generate-image",
					"bopen-tools:humanize",
				],
				agents: ["Caal", "Ridd"],
				sample: false,
			},
			{
				id: "mg-social-batch",
				title: "Produce a week of LinkedIn/X posts in the founder's voice",
				class: "task",
				summary:
					"Caal and Parker draft a week of posts in the founder's captured voice and run each through a de-AI pass before scheduling, since a steady posting cadence correlates with materially higher AI-citation rates for the person behind the account.",
				skills: ["marketing-skills:social", "bopen-tools:persona", "bopen-tools:humanize"],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-social-listening",
				title: "Produce a weekly trend and competitor social-listening report",
				class: "task",
				summary:
					"Parker pulls a cited summary of what's trending and what competitors are saying on X this week, so content and positioning react to real signal you can trace back to specific posts and accounts.",
				skills: [
					"bopen-tools:x-research",
					"bopen-tools:x-tweet-search",
					"marketing-skills:competitor-profiling",
				],
				agents: ["Parker"],
				sample: false,
			},
			{
				id: "mg-ab-test-design",
				title: "Design a single A/B experiment with a real stats plan",
				class: "task",
				summary:
					"Caal produces the hypothesis and variant spec plus a stats plan covering sample size and test duration, so the experiment runs long enough to reach significance before anyone reads the result.",
				skills: ["marketing-skills:ab-testing"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-analytics-audit",
				title: "Audit a GA4 tracking plan for gaps and broken events",
				class: "task",
				summary:
					"Parker returns a gap report on missing or broken events and attribution problems, so the numbers the rest of the team reports against are trustworthy.",
				skills: ["marketing-skills:analytics"],
				agents: ["Parker"],
				sample: false,
			},
			{
				id: "mg-pr-pitch",
				title: "Build a PR pitch and media list ready to send",
				class: "task",
				summary:
					"Caal and Parker assemble a journalist list and pitch angles tailored to the story, so outreach starts from named reporters who cover your space and a hook written for each one.",
				skills: ["marketing-skills:public-relations", "bopen-tools:humanize"],
				agents: ["Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-directory-sprint",
				title: "Run a directory-submission sprint with tracked backlinks",
				class: "task",
				summary:
					"Caal submits to a prioritized list of directories and tracks the resulting backlinks, capturing the earned-media surface where most AI brand mentions actually originate.",
				skills: ["marketing-skills:directory-submissions"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-sales-onepager",
				title: "Build a sales one-pager or competitive battlecard",
				class: "task",
				summary:
					"Flow and Caal produce a leave-behind sales asset built from real competitive research, so the sales team can point to sourced claims and side-by-side comparisons in the room.",
				skills: [
					"marketing-skills:sales-enablement",
					"marketing-skills:competitor-profiling",
					"bopen-tools:humanize",
				],
				agents: ["Flow", "Caal"],
				sample: false,
			},
			{
				id: "mg-bsv-community-pulse",
				title: "Produce a BSV/1Sat community pulse and sentiment report",
				class: "task",
				summary:
					"Ordi snapshots community health — engagement signal, marketplace activity, price context, and X sentiment — for a BSV-native product, giving a crypto-native go-to-market a real read on its own audience.",
				skills: [
					"1sat:ordinals-marketplace",
					"bsv-skills:check-bsv-price",
					"bopen-tools:x-research",
				],
				agents: ["Ordi"],
				sample: false,
			},
			{
				id: "mg-campaign-landing-chain",
				title: "Campaign landing page: copy to design to creative assets",
				class: "chain",
				summary:
					"Caal writes the positioning-driven copy, Ridd designs the page, and Lisa produces the on-brand imagery — a fully designed landing page carried from message to final visuals through three named handoffs. The canonical Caal-to-Ridd-to-Lisa chain.",
				skills: [
					"marketing-skills:copywriting",
					"gemskills:generate-image",
					"bopen-tools:humanize",
				],
				agents: ["Caal", "Ridd", "Lisa"],
				sample: false,
			},
			{
				id: "mg-sales-enablement-chain",
				title: "Research-informed sales enablement package",
				class: "chain",
				summary:
					"Parker gathers competitive research, Caal shapes the positioning, and Flow writes the sales one-pager, with each handoff adding a layer the next depends on, so the leave-behind rests on real competitor intelligence.",
				skills: [
					"marketing-skills:competitor-profiling",
					"marketing-skills:product-marketing",
					"marketing-skills:sales-enablement",
					"bopen-tools:humanize",
				],
				agents: ["Parker", "Caal", "Flow"],
				sample: false,
			},
			{
				id: "mg-content-engine-chain",
				title: "Content engine: trend research to strategy to published calendar",
				class: "chain",
				summary:
					"Parker pulls trend data, Caal builds the SEO/GEO strategy and a content calendar tuned for AI-answer citation, so every planned topic traces back to a real search or social signal Parker surfaced.",
				skills: [
					"bopen-tools:x-research",
					"marketing-skills:content-strategy",
					"marketing-skills:ai-seo",
				],
				agents: ["Parker", "Caal"],
				sample: false,
			},
			{
				id: "mg-web3-launch-chain",
				title: "Web3-native launch: community pulse to framing to press angle",
				class: "chain",
				summary:
					"Ordi reads the crypto-community pulse, Caal frames the campaign for that audience, and Parker develops the press angle, so the launch speaks to a crypto-native market in its own language and arrives with a press hook ready to send.",
				skills: [
					"1sat:ordinals-marketplace",
					"marketing-skills:launch",
					"marketing-skills:public-relations",
					"bopen-tools:humanize",
				],
				agents: ["Ordi", "Caal", "Parker"],
				sample: false,
			},
			{
				id: "mg-founder-ghostwriting-chain",
				title: "Founder ghostwriting loop: trend scan to voice-matched draft to schedule",
				class: "chain",
				summary:
					"Parker scans trends, Caal drafts against the founder's captured voice profile and runs a de-AI pass before scheduling — a recurring content pipeline that sounds like the founder and publishes at the steady cadence AI crawlers reward as an expertise signal.",
				skills: [
					"bopen-tools:x-research",
					"bopen-tools:persona",
					"marketing-skills:social",
					"bopen-tools:humanize",
				],
				agents: ["Parker", "Caal"],
				sample: true,
			},
			{
				id: "mg-icp-doc",
				title: "ICP and Ideal Customer Profile the whole team references",
				class: "foundation",
				summary:
					"Caal and Parker produce a fill-in-the-blank Ideal Customer Profile grounded in customer research, so every future copy, ad, sales, and onboarding task starts from the same documented picture of who you're selling to.",
				skills: ["marketing-skills:customer-research", "marketing-skills:product-marketing"],
				agents: ["Caal", "Parker"],
				sample: true,
			},
			{
				id: "mg-voice-tone-sheet",
				title: "Brand voice and tone sheet that keeps drafts out of AI-slop territory",
				class: "foundation",
				summary:
					"Caal captures a voice profile from the founder's real writing so every future draft stays on-brand and recognizably human. The foundation the humanize pass and every content playbook lean on.",
				skills: ["bopen-tools:persona", "marketing-skills:copywriting"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-channel-manifest",
				title: "Channel strategy manifest with cadence and owners",
				class: "foundation",
				summary:
					"Caal documents which channels the team runs and at what cadence, owned by whom, so nobody re-litigates priorities every week. A one-page channel plan the team executes against.",
				skills: ["marketing-skills:marketing-plan"],
				agents: ["Caal"],
				sample: false,
			},
			{
				id: "mg-competitive-briefing",
				title: "Competitive landscape briefing doc that stays current",
				class: "foundation",
				summary:
					"Parker maintains a living competitor reference — positioning, pricing, messaging, and recent moves — that copy, sales, positioning, and strategy work all cite, so the team argues from one shared, up-to-date view of the market.",
				skills: ["marketing-skills:competitor-profiling"],
				agents: ["Parker"],
				sample: false,
			},
			{
				id: "mg-pricing-packaging-doc",
				title: "Pricing and packaging decision doc other playbooks can cite",
				class: "foundation",
				summary:
					"Caal documents the pricing rationale — tiers, value metric, packaging, offer structure — so downstream playbooks cite one settled decision every time pricing comes up in a task.",
				skills: ["marketing-skills:pricing", "marketing-skills:offers"],
				agents: ["Caal"],
				sample: false,
			},
		],
	},
	{
		slug: "software-development",
		productId: "pack-software-development",
		name: "Software Development",
		tagline: "Architecture to shipped code, reviewed and tested.",
		plugins: [
			{
				name: "bopen-tools",
				marketplace: "b-open-io",
				install: "claude plugin install bopen-tools@b-open-io",
			},
			{
				name: "sigma-auth",
				marketplace: "b-open-io",
				install: "claude plugin install sigma-auth@b-open-io",
			},
			{
				name: "audit-context-building",
				marketplace: "trailofbits",
				install: "claude plugin install audit-context-building@trailofbits",
			},
			{
				name: "differential-review",
				marketplace: "trailofbits",
				install: "claude plugin install differential-review@trailofbits",
			},
			{
				name: "superpowers",
				marketplace: "claude-plugins-official",
				install: "claude plugin install superpowers@claude-plugins-official",
			},
			{
				name: "vercel-react-native-skills",
				marketplace: "portable-skill",
				install:
					"npx skills add vercel-react-native-skills (source pinned in the pack setup manifest)",
			},
			{
				name: "webapp-testing",
				marketplace: "portable-skill",
				install: "npx skills add webapp-testing (source pinned in the pack setup manifest)",
			},
			{
				name: "plugin-dev",
				marketplace: "claude-plugins-official",
				install: "claude plugin install plugin-dev@claude-plugins-official",
			},
			{
				name: "better-auth-security-best-practices",
				marketplace: "portable-skill",
				install:
					"npx skills add better-auth-security-best-practices (source pinned in the pack setup manifest)",
			},
			{
				name: "two-factor-authentication-best-practices",
				marketplace: "portable-skill",
				install:
					"npx skills add two-factor-authentication-best-practices (source pinned in the pack setup manifest)",
			},
			{
				name: "email-and-password-best-practices",
				marketplace: "portable-skill",
				install:
					"npx skills add email-and-password-best-practices (source pinned in the pack setup manifest)",
			},
			{
				name: "react-doctor",
				marketplace: "portable-skill",
				install: "npx skills add react-doctor (source pinned in the pack setup manifest)",
			},
			{
				name: "stripe",
				marketplace: "claude-plugins-official",
				install: "claude plugin install stripe@claude-plugins-official",
			},
			{
				name: "static-analysis",
				marketplace: "trailofbits",
				install: "claude plugin install static-analysis@trailofbits",
			},
			{
				name: "convex-realtime",
				marketplace: "portable-skill",
				install: "npx skills add convex-realtime (source pinned in the pack setup manifest)",
			},
			{
				name: "convex-functions",
				marketplace: "portable-skill",
				install: "npx skills add convex-functions (source pinned in the pack setup manifest)",
			},
			{
				name: "convex-file-storage",
				marketplace: "portable-skill",
				install: "npx skills add convex-file-storage (source pinned in the pack setup manifest)",
			},
			{
				name: "gemskills",
				marketplace: "b-open-io",
				install: "claude plugin install gemskills@b-open-io",
			},
			{
				name: "convex-cron-jobs",
				marketplace: "portable-skill",
				install: "npx skills add convex-cron-jobs (source pinned in the pack setup manifest)",
			},
			{
				name: "property-based-testing",
				marketplace: "trailofbits",
				install: "claude plugin install property-based-testing@trailofbits",
			},
			{
				name: "entry-point-analyzer",
				marketplace: "trailofbits",
				install: "claude plugin install entry-point-analyzer@trailofbits",
			},
			{
				name: "product-skills",
				marketplace: "b-open-io",
				install: "claude plugin install product-skills@b-open-io",
			},
		],
		playbooks: [
			{
				id: "sd-saas-from-zero",
				title: "Scaffold, auth, bill, and deploy a SaaS in coordinated waves",
				class: "blueprint",
				summary:
					"Theo, Idris, Root, Jason, Jerry, and Torque take a product from empty repo to a running, authenticated, billed, deployed, tested, and security-reviewed skeleton, with auth handed to a named specialist and a review step, since auth and billing are exactly where scaffolding agents make the costliest mistakes.",
				skills: [
					"bopen-tools:create-next-project",
					"bopen-tools:software-factory",
					"bopen-tools:wave-coordinator",
					"sigma-auth:setup-nextjs",
					"bopen-tools:devops-scripts",
					"bopen-tools:wait-for-ci",
					"bopen-tools:perf-audit",
				],
				agents: ["Theo", "Idris", "Root", "Jason", "Jerry", "Torque"],
				sample: false,
			},
			{
				id: "sd-software-factory",
				title: "Stand up a self-iterating build loop with a real verification gate",
				class: "blueprint",
				summary:
					"Root, Satchmo, Jason, and Kayle wire an unattended build-verify-ship loop scoped to a real blast radius, with a stop condition and cost tracking so it keeps shipping verified work within a budget. Directly answers the 2026 finding that teams wiring up agent loops without a verification gate are the ones that spend without shipping.",
				skills: [
					"bopen-tools:software-factory",
					"bopen-tools:wave-coordinator",
					"bopen-tools:coordinator",
					"bopen-tools:free-roam-testing",
					"bopen-tools:cost-tracking",
				],
				agents: ["Root", "Satchmo", "Jason", "Kayle"],
				sample: false,
			},
			{
				id: "sd-legacy-rescue",
				title: "Rescue a legacy codebase: audit, refactor plan, staged migration",
				class: "blueprint",
				summary:
					"Kayle, Jerry, Jason, and Root build a real map of a brownfield repo with systematic debugging and differential review, then produce a prioritized, staged detangling plan that sequences the risky changes behind the safe ones.",
				skills: [
					"audit-context-building:audit-context-building",
					"differential-review:differential-review",
					"bopen-tools:hunter-skeptic-referee",
					"superpowers:systematic-debugging",
					"bopen-tools:wait-for-ci",
				],
				agents: ["Kayle", "Jerry", "Jason", "Root"],
				sample: false,
			},
			{
				id: "sd-mobile-web-parity",
				title: "Launch web and native builds sharing one backend and test suite",
				class: "blueprint",
				summary:
					"Theo, Kira, Idris, and Jason build synchronized Next.js and React Native surfaces against one backend and one Playwright suite, so the two clients never drift into separate codebases.",
				skills: [
					"bopen-tools:create-next-project",
					"vercel-react-native-skills",
					"bopen-tools:generative-ui",
					"webapp-testing",
				],
				agents: ["Theo", "Kira", "Idris", "Jason"],
				sample: false,
			},
			{
				id: "sd-mcp-native-launch",
				title: "Launch a product that is a web app and an MCP server on day one",
				class: "blueprint",
				summary:
					"Orbit, Theo, Root, and Jason ship a product usable both as a normal web app and as a tool inside Claude Desktop, ChatGPT, Cursor, and VS Code from day one, published and CI-gated so the MCP surface ships and stays tested alongside the web app.",
				skills: [
					"plugin-dev:mcp-integration",
					"bopen-tools:mcp-apps",
					"bopen-tools:create-mcp-app",
					"bopen-tools:npm-publish",
					"bopen-tools:wait-for-ci",
				],
				agents: ["Orbit", "Theo", "Root", "Jason"],
				sample: false,
			},
			{
				id: "sd-agent-org-bootstrap",
				title: "Bootstrap a multi-agent dev org: coordinator, worker lanes, advisor gate",
				class: "blueprint",
				summary:
					"Satchmo, Kayle, Root, and Zack set up a main-seat/worker-lane split with a second-opinion advisor gate, so cheaper and specialized executors each run under an explicit spec while the main seat keeps planning, review, verification, and git.",
				skills: [
					"bopen-tools:coordinator",
					"bopen-tools:wave-coordinator",
					"bopen-tools:advisor",
					"plugin-dev:agent-development",
				],
				agents: ["Satchmo", "Kayle", "Root", "Zack"],
				sample: false,
			},
			{
				id: "sd-passkey-bitcoin-auth",
				title: "Add passkey + Bitcoin wallet auth to an existing Next.js app",
				class: "feature",
				summary:
					"Theo and Jerry add modern auth without hand-rolling session or token handling, security-reviewed before merge. Siggy's Sigma Identity patterns give wallet-native sign-in alongside passkeys.",
				skills: [
					"sigma-auth:setup-nextjs",
					"better-auth-security-best-practices",
					"two-factor-authentication-best-practices",
				],
				agents: ["Theo", "Jerry", "Siggy"],
				sample: false,
			},
			{
				id: "sd-2fa-stepup",
				title: "Add 2FA / passkey step-up to existing auth",
				class: "feature",
				summary:
					"Jerry and Theo close an account-takeover gap with tested step-up auth and a device-authorization flow for CLI and desktop, security-reviewed before it ships so the new factor doesn't open a fresh hole of its own.",
				skills: [
					"two-factor-authentication-best-practices",
					"email-and-password-best-practices",
					"sigma-auth:device-authorization",
				],
				agents: ["Jerry", "Theo", "Siggy"],
				sample: false,
			},
			{
				id: "sd-mcp-expose",
				title: "Expose an existing app's core actions as an MCP server",
				class: "feature",
				summary:
					"Orbit makes the product callable by any MCP host — Claude Desktop, ChatGPT, Cursor, VS Code — without a second integration effort, with the tool contract designed to be safe and discoverable.",
				skills: ["plugin-dev:mcp-integration", "bopen-tools:mcp-apps"],
				agents: ["Orbit"],
				sample: false,
			},
			{
				id: "sd-generative-ui-surface",
				title: "Add an AI-rendered dashboard or form surface, safely",
				class: "feature",
				summary:
					"Theo and Orbit build a generative-UI surface that renders from model output via json-render without raw HTML injection, so users get dashboards and forms that recompose around whatever data the model returns.",
				skills: [
					"bopen-tools:generative-ui",
					"bopen-tools:json-render-core",
					"bopen-tools:json-render-react",
				],
				agents: ["Theo", "Orbit"],
				sample: false,
			},
			{
				id: "sd-e2e-ci-gate",
				title: "Add an e2e suite and a merge-blocking coverage gate",
				class: "feature",
				summary:
					"Jason and Root add Playwright end-to-end coverage and wire it as a CI gate that blocks merges, replacing we-will-add-tests-later with an enforced bar.",
				skills: ["webapp-testing", "bopen-tools:wait-for-ci"],
				agents: ["Jason", "Root"],
				sample: false,
			},
			{
				id: "sd-nextjs16-migrate",
				title: "Migrate a feature to Next.js 16 async APIs without breaking it",
				class: "feature",
				summary:
					"Theo runs a codemod-driven migration to Turbopack and async APIs, with a react-doctor pass to catch re-render and hook regressions, so a feature keeps working across the platform major.",
				skills: ["bopen-tools:nextjs-upgrade", "react-doctor"],
				agents: ["Theo"],
				sample: false,
			},
			{
				id: "sd-stripe-billing",
				title: "Add Stripe billing and signature-verified webhooks to an app",
				class: "feature",
				summary:
					"Theo builds subscription billing with idempotent, signature-verified webhook handling, Jason covers the event matrix with test cards, and Jerry security-reviews it, so retries and out-of-order events resolve to exactly one fulfillment.",
				skills: ["stripe:stripe-best-practices", "stripe:test-cards", "static-analysis:semgrep"],
				agents: ["Theo", "Jason", "Jerry"],
				sample: false,
			},
			{
				id: "sd-realtime-sync",
				title: "Add realtime sync: live updates, presence, collaborative state",
				class: "feature",
				summary:
					"Idris and Theo add live-updating UI with presence and shared state on Convex, without hand-rolling WebSocket plumbing.",
				skills: ["convex-realtime", "convex-functions"],
				agents: ["Idris", "Theo"],
				sample: false,
			},
			{
				id: "sd-file-upload",
				title: "Add a validated, optimized file upload and storage pipeline",
				class: "feature",
				summary:
					"Idris, Theo, and Torque add size-limited, validated file handling on Convex storage with images optimized on the way in, so uploads stay bounded and every stored image is already compressed for delivery.",
				skills: ["convex-file-storage", "gemskills:optimize-images"],
				agents: ["Idris", "Theo", "Torque"],
				sample: false,
			},
			{
				id: "sd-background-jobs",
				title: "Add a monitored background job / cron pipeline",
				class: "feature",
				summary:
					"Idris and Root add scheduled, monitored work with real observability on Convex cron, replacing fire-and-forget setTimeout calls that silently fail.",
				skills: ["convex-cron-jobs", "bopen-tools:devops-scripts"],
				agents: ["Idris", "Root"],
				sample: false,
			},
			{
				id: "sd-cost-guardrails",
				title: "Add cost/token tracking and budget guardrails to an agentic feature",
				class: "feature",
				summary:
					"Satchmo and Root instrument an agent workflow with per-request cost tracking and a budget ceiling, so monthly bills stop swinging 2-3x quarter over quarter. Cost volatility is the top 2026 pain point for teams running agentic workflows.",
				skills: ["bopen-tools:cost-tracking"],
				agents: ["Satchmo", "Root"],
				sample: false,
			},
			{
				id: "sd-hooks-guardrails",
				title: "Wire up repo guardrails with Claude Code hooks",
				class: "feature",
				summary:
					"Zack and Root add enforced pre-commit checks — lint, secret scans, format, type-check — that run automatically on every commit, so the repo's rules hold even when someone's rushing a fix under deadline.",
				skills: ["plugin-dev:hook-development", "bopen-tools:hook-manager"],
				agents: ["Zack", "Root"],
				sample: false,
			},
			{
				id: "sd-dep-secrets-audit",
				title: "Run a dependency + secrets audit before a release",
				class: "task",
				summary:
					"Paul produces a go/no-go release gate with known CVEs and leaked secrets caught before ship, so a release doesn't carry a supply-chain or credential-exposure surprise into production.",
				skills: [
					"static-analysis:semgrep",
					"static-analysis:codeql",
					"bopen-tools:code-audit-scripts",
				],
				agents: ["Paul"],
				sample: false,
			},
			{
				id: "sd-perf-audit",
				title: "Run a full performance audit: Lighthouse, bundle, images",
				class: "task",
				summary:
					"Torque returns a scored, prioritized fix list covering blocking scripts, oversized bundles, unoptimized images, and render-blocking CSS, ranked so you can act on the biggest wins the same day.",
				skills: ["bopen-tools:perf-audit", "bopen-tools:frontend-performance"],
				agents: ["Torque"],
				sample: true,
			},
			{
				id: "sd-pr-security-scan",
				title: "Security-scan a single PR before merge",
				class: "task",
				summary:
					"Jerry runs a severity-rated Semgrep and CodeQL scan of one diff, catching injection, auth, and data-flow issues before they merge. Routing pattern-detectable issues to an agent reserves human attention for the critical logic.",
				skills: [
					"static-analysis:semgrep",
					"static-analysis:codeql",
					"static-analysis:sarif-parsing",
				],
				agents: ["Jerry"],
				sample: false,
			},
			{
				id: "sd-differential-review",
				title: "Differential review of a risky diff before merge",
				class: "task",
				summary:
					"Kayle runs a structured before/after risk read on a change too big to eyeball, so the review doesn't degrade into generic feedback the way a single big prompt does past 200 lines.",
				skills: ["differential-review:differential-review"],
				agents: ["Kayle"],
				sample: false,
			},
			{
				id: "sd-bug-hunt",
				title: "Run a three-phase adversarial bug hunt",
				class: "task",
				summary:
					"Jerry, Kayle, and Jason run a Hunter-Skeptic-Referee pass that produces high-fidelity bug reports without single-model sycophancy — the multi-agent review pattern that outperforms one-prompt review on anything non-trivial.",
				skills: ["bopen-tools:hunter-skeptic-referee"],
				agents: ["Jerry", "Kayle", "Jason"],
				sample: false,
			},
			{
				id: "sd-backfill-tests",
				title: "Backfill unit and integration coverage for an untested module",
				class: "task",
				summary:
					"Jason puts a safety net around code nobody dares touch, using property-based testing to cover the happy path, the edge cases, the error conditions, and the invariants that must always hold, so the module can finally be refactored safely.",
				skills: ["webapp-testing", "property-based-testing"],
				agents: ["Jason"],
				sample: false,
			},
			{
				id: "sd-free-roam-testing",
				title: "Run a free-roam exploratory bug-discovery session on staging",
				class: "task",
				summary:
					"Jason explores staging like a real user and surfaces the bugs a scripted suite never thinks to try, returning a reproducible list before those defects reach production.",
				skills: ["bopen-tools:free-roam-testing"],
				agents: ["Jason"],
				sample: false,
			},
			{
				id: "sd-verify-ci",
				title: "Verify CI is green before proceeding",
				class: "task",
				summary:
					"Root turns CI status into a blocking gate that holds every downstream step until the pipeline is green, so nothing builds on a broken commit.",
				skills: ["bopen-tools:wait-for-ci"],
				agents: ["Root"],
				sample: false,
			},
			{
				id: "sd-npm-publish",
				title: "Publish an npm package: version bump, changelog, release",
				class: "task",
				summary:
					"Root and Orbit run a clean, reproducible release with the version bumped, changelog written, and tag pushed in one pass, so the published package matches exactly what's in the repo.",
				skills: ["bopen-tools:npm-publish", "bopen-tools:check-version"],
				agents: ["Root", "Orbit"],
				sample: false,
			},
			{
				id: "sd-mcp-publish",
				title: "Publish an MCP server that installs cleanly for other teams",
				class: "task",
				summary:
					"Orbit runs the MCP publish checklist — npx compatibility, package.json fields, discovery metadata, install docs — so the server installs cleanly on a teammate's machine the first time they run it.",
				skills: ["plugin-dev:mcp-integration", "bopen-tools:npm-publish"],
				agents: ["Orbit"],
				sample: false,
			},
			{
				id: "sd-context-sweep",
				title: "Build a codebase context map before a big audit",
				class: "task",
				summary:
					"Kayle produces a map of the codebase — module boundaries, data flow, entry points, external dependencies — so the next audit or refactor starts from a shared reference every reviewer can read.",
				skills: ["audit-context-building:audit-context-building"],
				agents: ["Kayle"],
				sample: false,
			},
			{
				id: "sd-image-bundle-opt",
				title: "Cut page weight with an image and bundle optimization pass",
				class: "task",
				summary:
					"Torque compresses images and trims the largest bundle contributors, cutting page weight and JavaScript payload without a redesign or any change to how the product behaves.",
				skills: ["gemskills:optimize-images", "bopen-tools:perf-audit"],
				agents: ["Torque"],
				sample: false,
			},
			{
				id: "sd-hooks-setup",
				title: "Wire Claude Code hooks for a repo's guardrails",
				class: "task",
				summary:
					"Zack and Root configure repo hooks so lint, secret, and format checks run automatically on every change, turning a convention nobody follows into an enforced guardrail.",
				skills: ["plugin-dev:hook-development", "bopen-tools:hook-manager"],
				agents: ["Zack", "Root"],
				sample: false,
			},
			{
				id: "sd-entrypoint-mapping",
				title: "Map the attack surface of a new service before a pentest",
				class: "task",
				summary:
					"Paul enumerates every externally reachable input for a service before a pentest, so the review starts from a complete surface map with each endpoint, header, parameter, and upload path accounted for.",
				skills: ["entry-point-analyzer:entry-point-analyzer"],
				agents: ["Paul"],
				sample: false,
			},
			{
				id: "sd-scaffold-plugin",
				title: "Scaffold a correctly structured internal Claude Code plugin",
				class: "task",
				summary:
					"Zack scaffolds a plugin with the directory layout that auto-discovery expects for skills, agents, hooks, and commands, so every component registers the first time the plugin loads.",
				skills: [
					"plugin-dev:plugin-structure",
					"plugin-dev:skill-development",
					"plugin-dev:agent-development",
				],
				agents: ["Zack"],
				sample: false,
			},
			{
				id: "sd-soc2-evidence-task",
				title: "Organize technical-control evidence for a SOC 2 audit",
				class: "task",
				summary:
					"Paul assembles and structures the technical-control evidence an auditor will ask for, so the audit opens with an organized evidence set mapped to each control in scope.",
				skills: ["product-skills:soc2-evidence-collection"],
				agents: ["Paul"],
				sample: false,
			},
			{
				id: "sd-delivery-chain",
				title: "Delivery chain: architecture plan to build to test to security audit",
				class: "chain",
				summary:
					"Kayle plans the architecture, Theo builds, Jason tests, and Jerry security-audits — one feature carried end to end through four named specialists with a clean handoff at each stage, the maker-checker pattern that outperforms one big review prompt. The canonical Kayle-to-Theo-to-Jason-to-Jerry chain.",
				skills: [
					"static-analysis:semgrep",
					"static-analysis:codeql",
					"webapp-testing",
					"bopen-tools:wait-for-ci",
				],
				agents: ["Kayle", "Theo", "Jason", "Jerry"],
				sample: true,
			},
			{
				id: "sd-ship-safely-chain",
				title: "Ship-a-feature-safely chain: build to perf audit to test to deploy",
				class: "chain",
				summary:
					"Theo builds, Torque runs a perf audit, Jason tests, and Root deploys, with each handoff blocking the next, so a feature is measured for speed and covered by tests before it ever reaches a user.",
				skills: [
					"bopen-tools:create-next-project",
					"bopen-tools:perf-audit",
					"webapp-testing",
					"bopen-tools:wait-for-ci",
				],
				agents: ["Theo", "Torque", "Jason", "Root"],
				sample: false,
			},
			{
				id: "sd-incident-response-chain",
				title: "Security incident response chain: sweep to audit to risk call to patch",
				class: "chain",
				summary:
					"Paul sweeps for exposure, Jerry audits the affected code, Kayle makes the risk call, and Root ships the patch, so an incident moves through one ordered path with a single owner at each step.",
				skills: [
					"bopen-tools:code-audit-scripts",
					"static-analysis:semgrep",
					"static-analysis:codeql",
					"audit-context-building:audit-context-building",
				],
				agents: ["Paul", "Jerry", "Kayle", "Root"],
				sample: false,
			},
			{
				id: "sd-upgrade-chain",
				title: "Platform upgrade chain: impact assessment to codemod to regression to verify",
				class: "chain",
				summary:
					"Kayle assesses impact, Theo runs the codemod, Jason regression-tests, and Root verifies CI — so a major-version upgrade lands without a surprise outage.",
				skills: [
					"audit-context-building:audit-context-building",
					"bopen-tools:nextjs-upgrade",
					"webapp-testing",
					"bopen-tools:wait-for-ci",
				],
				agents: ["Kayle", "Theo", "Jason", "Root"],
				sample: false,
			},
			{
				id: "sd-mcp-productization-chain",
				title: "MCP productization chain: build to package to test contract to publish",
				class: "chain",
				summary:
					"Orbit builds the MCP server, Zack shapes the command surface, Jason tests the tool contract, and Root publishes — turning an internal tool into an installable, tested, published MCP server.",
				skills: [
					"plugin-dev:mcp-integration",
					"plugin-dev:command-development",
					"webapp-testing",
					"bopen-tools:npm-publish",
				],
				agents: ["Orbit", "Zack", "Jason", "Root"],
				sample: false,
			},
			{
				id: "sd-agent-bootstrap-chain",
				title: "Agent system bootstrap chain: design to author to review to benchmark",
				class: "chain",
				summary:
					"Satchmo architects the agent, Zack authors it, Kayle reviews, and Jason benchmarks — so a new agent is designed, built, reviewed, and measured before it's trusted with real work.",
				skills: [
					"plugin-dev:agent-development",
					"plugin-dev:skill-development",
					"bopen-tools:benchmark-skills",
				],
				agents: ["Satchmo", "Zack", "Kayle", "Jason"],
				sample: false,
			},
			{
				id: "sd-tech-stack-manifest",
				title: "Tech-stack manifest: languages, frameworks, infra, and who owns what",
				class: "foundation",
				summary:
					"A machine-readable manifest of the buyer's real stack so every other playbook in this pack starts from documented facts about the languages, frameworks, infra, and ownership in play — the AGENTS.md-style onboarding doc that agent-compatible codebases now depend on.",
				skills: ["bopen-tools:runtime-context"],
				agents: [
					"Theo",
					"Kira",
					"Idris",
					"Jason",
					"Root",
					"Torque",
					"Jerry",
					"Kayle",
					"Paul",
					"Orbit",
					"Satchmo",
					"Zack",
				],
				sample: true,
			},
			{
				id: "sd-cicd-baseline",
				title: "CI/CD baseline doc: provider, required checks, deploy targets, secrets policy",
				class: "foundation",
				summary:
					"Root documents the pipeline provider, required checks, deploy targets, and secrets policy, so deploy and CI playbooks plug into the buyer's actual pipeline on their first run.",
				skills: ["bopen-tools:wait-for-ci", "bopen-tools:devops-scripts"],
				agents: ["Root"],
				sample: false,
			},
			{
				id: "sd-coding-conventions",
				title: "Coding conventions and review-bar doc: lint rules, commit style, merge blockers",
				class: "foundation",
				summary:
					"A fill-in-the-blank doc capturing lint rules, commit style, PR size limits, and merge blockers, so review and test playbooks enforce the buyer's actual bar on every change they touch.",
				skills: ["bopen-tools:code-audit-scripts"],
				agents: ["Jerry", "Jason", "Kayle"],
				sample: false,
			},
			{
				id: "sd-security-profile",
				title: "Security and compliance profile: sensitive-data map, controls, sign-off owner",
				class: "foundation",
				summary:
					"Paul maps the sensitive data, applicable controls, sign-off owner, and residual risk via a gap analysis, so security tasks scope to what actually matters for this buyer's risk profile.",
				skills: ["product-skills:soc2-gap-analysis"],
				agents: ["Paul"],
				sample: false,
			},
			{
				id: "sd-agent-charter",
				title: "Agent operating charter: installed staff, model tier, escalation path",
				class: "foundation",
				summary:
					"Satchmo and Root document which staff are installed, their budget and model tier, and the escalation path, so blueprint and chain playbooks know which agents exist in this org and when to escalate to a human.",
				skills: ["bopen-tools:cost-tracking", "bopen-tools:coordinator"],
				agents: ["Satchmo", "Root"],
				sample: false,
			},
		],
	},
	{
		slug: "business-operations",
		productId: "pack-business-operations",
		name: "Business Operations",
		tagline: "Strategy, finance, legal, and execution cadence.",
		plugins: [
			{
				name: "pm-execution",
				marketplace: "pm-skills",
				install: "claude plugin install pm-execution@pm-skills",
			},
			{
				name: "bopen-tools",
				marketplace: "b-open-io",
				install: "claude plugin install bopen-tools@b-open-io",
			},
			{
				name: "product-skills",
				marketplace: "b-open-io",
				install: "claude plugin install product-skills@b-open-io",
			},
			{
				name: "pm-data-analytics",
				marketplace: "pm-skills",
				install: "claude plugin install pm-data-analytics@pm-skills",
			},
			{
				name: "gemskills",
				marketplace: "b-open-io",
				install: "claude plugin install gemskills@b-open-io",
			},
			{
				name: "pm-product-strategy",
				marketplace: "pm-skills",
				install: "claude plugin install pm-product-strategy@pm-skills",
			},
			{
				name: "pm-market-research",
				marketplace: "pm-skills",
				install: "claude plugin install pm-market-research@pm-skills",
			},
			{
				name: "pm-go-to-market",
				marketplace: "pm-skills",
				install: "claude plugin install pm-go-to-market@pm-skills",
			},
			{
				name: "pm-toolkit",
				marketplace: "pm-skills",
				install: "claude plugin install pm-toolkit@pm-skills",
			},
			{
				name: "internal-comms",
				marketplace: "portable-skill",
				install: "npx skills add internal-comms (source pinned in the pack setup manifest)",
			},
			{
				name: "pm-product-discovery",
				marketplace: "pm-skills",
				install: "claude plugin install pm-product-discovery@pm-skills",
			},
		],
		playbooks: [
			{
				id: "bo-quarter-in-a-box",
				title: "Run a full quarterly planning cycle: OKRs to roadmap to sprint to retro",
				class: "blueprint",
				summary:
					"Wags runs an entire quarter end to end — objectives, roadmap, sprint cadence, and the retro loop — routed into Linear as real issues, forcing the brainstorm-to-measurable-KR pipeline so what lands in the tracker is a set of measurable key results with owners and issues attached.",
				skills: [
					"pm-execution:brainstorm-okrs",
					"pm-execution:outcome-roadmap",
					"pm-execution:sprint-plan",
					"pm-execution:retro",
					"pm-execution:pre-mortem",
					"bopen-tools:linear-planning",
				],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-soc2-program",
				title: "Get audit-ready for SOC 2: gap analysis to policy to evidence to handoff",
				class: "blueprint",
				summary:
					"Anthony and Paul map the controls, draft the policies, organize the evidence, and rehearse the auditor walkthrough so you reach the audit with the control set already evidenced and documented. Explicitly scopes agents out of production access, since un-scoped agent access is now one of the most common audit exceptions. Gets you audit-ready; a licensed CPA firm still issues the report.",
				skills: [
					"product-skills:soc2-gap-analysis",
					"product-skills:soc2-policy-drafting",
					"product-skills:soc2-evidence-collection",
					"product-skills:legal-compliance",
				],
				agents: ["Anthony", "Paul"],
				sample: false,
			},
			{
				id: "bo-autonomous-org",
				title: "Stand up a self-managing agent org with budget gates and onboarding",
				class: "blueprint",
				summary:
					"Chief, Milton, and Martha stand up the same heartbeat-delegation, budget-gate, and agent-onboarding system bOpen runs internally, scoped to your company and wired to your own tools so it runs real operations on day one.",
				skills: [
					"bopen-tools:cost-tracking",
					"bopen-tools:front-desk",
					"bopen-tools:agent-onboarding",
				],
				agents: ["Chief", "Milton", "Martha"],
				sample: false,
			},
			{
				id: "bo-investor-reporting",
				title: "Build a recurring investor-ready reporting engine",
				class: "blueprint",
				summary:
					"Milton, Tina, and Chief turn metrics into a narrative, a deck, a board cadence, and a running data appendix you can defend, so the update becomes a repeatable process the team can run each quarter. It's built as the operator's first draft to restructure and sign off on before anything reaches investors.",
				skills: [
					"bopen-tools:cost-tracking",
					"pm-data-analytics:cohort-analysis",
					"gemskills:deck-creator",
				],
				agents: ["Milton", "Tina", "Chief"],
				sample: false,
			},
			{
				id: "bo-market-entry",
				title: "Validate and launch into a new market segment",
				class: "blueprint",
				summary:
					"Wags and Caal run the full strategic chain — PESTLE scan, market sizing, ICP, GTM strategy, launch — so entering a new segment is a validated decision that arrives already routed into an executable plan with owners.",
				skills: [
					"pm-product-strategy:pestle-analysis",
					"pm-market-research:market-sizing",
					"pm-go-to-market:ideal-customer-profile",
					"pm-go-to-market:gtm-strategy",
				],
				agents: ["Wags", "Caal"],
				sample: false,
			},
			{
				id: "bo-meeting-actionitem-pipeline",
				title: "Stand up a meeting-to-action-item pipeline with real owners and deadlines",
				class: "feature",
				summary:
					"Tina captures commitments and Wags routes every one into Linear with a real owner and a real deadline, fixing the 44%-of-action-items-never-done problem by giving every commitment a single system of record where it can be tracked to done.",
				skills: [
					"pm-execution:summarize-meeting",
					"pm-execution:stakeholder-map",
					"pm-execution:wwas",
					"bopen-tools:linear-planning",
				],
				agents: ["Tina", "Wags"],
				sample: false,
			},
			{
				id: "bo-cost-dashboard",
				title: "Build a real-time cost dashboard across Anthropic, Vercel, and Railway",
				class: "feature",
				summary:
					"Milton wires a live burn-rate view across your AI and infra spend so you know the number before the invoice surprises you. The dashboard covers our own AI/infra spend; general-ledger data still has to be supplied.",
				skills: ["bopen-tools:cost-tracking", "bopen-tools:charting"],
				agents: ["Milton"],
				sample: false,
			},
			{
				id: "bo-linear-sprint-cadence",
				title: "Set up a Linear-native sprint cadence with automatic retro capture",
				class: "feature",
				summary:
					"Wags wires a sprint cadence into Linear where the retro is a scheduled step in the cycle, so the team's process keeps improving on a fixed rhythm even under deadline pressure.",
				skills: ["bopen-tools:linear-planning", "pm-execution:sprint-plan", "pm-execution:retro"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-legal-doc-pipeline",
				title: "Stand up an on-demand legal document pipeline",
				class: "feature",
				summary:
					"Anthony turns around routine legal paperwork — NDA, privacy policy, ToS, DPA — same day, without a lawyer on retainer for every request. Each document is a first draft for your counsel to review before signing, and novel matters still go to a lawyer.",
				skills: [
					"pm-toolkit:draft-nda",
					"pm-toolkit:privacy-policy",
					"product-skills:legal-compliance",
				],
				agents: ["Anthony"],
				sample: false,
			},
			{
				id: "bo-structured-hiring",
				title: "Build a structured hiring loop with scorecards and calibration",
				class: "feature",
				summary:
					"Wags and Tina replace gut-feel interviewing with a scorecard-and-calibration system that raises inter-rater reliability, delivered as a reusable template and interview cadence you run in your existing ATS.",
				skills: [
					"pm-execution:job-stories",
					"pm-execution:stakeholder-map",
					"pm-execution:prioritization-frameworks",
				],
				agents: ["Wags", "Tina"],
				sample: false,
			},
			{
				id: "bo-competitive-intel",
				title: "Set up a competitive-intelligence feed with battlecards and sentiment",
				class: "feature",
				summary:
					"Parker and Caal keep battlecards and sentiment tracking current from real market signal, so a rep pulling a battlecard before a deal sees the competitor's latest moves and messaging already reflected in it.",
				skills: [
					"pm-market-research:competitor-analysis",
					"pm-market-research:sentiment-analysis",
					"pm-go-to-market:competitive-battlecard",
				],
				agents: ["Parker", "Caal"],
				sample: false,
			},
			{
				id: "bo-internal-comms",
				title: "Set up an internal-comms system with scheduled digests",
				class: "feature",
				summary:
					"Martha runs company announcements and scheduled digests on a set cadence, each cleared through a de-AI pass so the writing reads like a person on the team sent it.",
				skills: ["internal-comms", "bopen-tools:humanize"],
				agents: ["Martha"],
				sample: false,
			},
			{
				id: "bo-prd",
				title: "Draft a build-ready PRD for a new feature",
				class: "task",
				summary:
					"Wags produces a build-ready product spec in one sitting and routes it into Linear as structured issues, so engineering opens the sprint with acceptance criteria and scope already written down.",
				skills: ["pm-execution:create-prd", "bopen-tools:linear-planning"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-backlog-prioritization",
				title: "Run a prioritization pass on the backlog",
				class: "task",
				summary:
					"Wags produces a ranked backlog using a real framework like RICE or MoSCoW, with the score behind each item visible and reflected directly in Linear.",
				skills: ["pm-execution:prioritization-frameworks", "bopen-tools:linear-planning"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-release-notes",
				title: "Write customer-ready release notes for a shipped feature",
				class: "task",
				summary:
					"Wags turns a shipped change into customer-ready release notes without a separate writing pass, pulled from the Linear issues that shipped.",
				skills: ["pm-execution:release-notes"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-summarize-meeting",
				title: "Summarize a meeting transcript into decisions and owners",
				class: "task",
				summary:
					"Tina turns a transcript into a single source of truth for what was actually decided and who owns what, resolving vague next-week references into concrete owners.",
				skills: ["pm-execution:summarize-meeting"],
				agents: ["Tina"],
				sample: false,
			},
			{
				id: "bo-exec-update",
				title: "Draft a tight exec-readable status update",
				class: "task",
				summary:
					"Tina produces a who-what-and-how exec update — a scannable status brief a busy exec can read in under a minute and act on.",
				skills: [],
				agents: ["Tina"],
				sample: false,
			},
			{
				id: "bo-cohort-analysis",
				title: "Run a cohort retention analysis for the board deck",
				class: "task",
				summary:
					"Milton produces a real cohort retention chart with week-over-week curves, ready to drop into the board deck. Assumes the buyer supplies query access or exported data.",
				skills: ["pm-data-analytics:cohort-analysis", "bopen-tools:charting"],
				agents: ["Milton"],
				sample: false,
			},
			{
				id: "bo-cost-report",
				title: "Run a monthly Anthropic, Vercel, and Railway cost report",
				class: "task",
				summary:
					"Milton reports exactly what you spent and on what, every month, without manual reconciliation — so infra and AI burn is a number you already know before the invoice arrives.",
				skills: ["bopen-tools:cost-tracking"],
				agents: ["Milton"],
				sample: true,
			},
			{
				id: "bo-soc2-gap",
				title: "Run a SOC 2 gap analysis",
				class: "task",
				summary:
					"Anthony tells you exactly which controls are missing before you ever talk to an auditor, so the readiness work is scoped and dated at the start of the program.",
				skills: ["product-skills:soc2-gap-analysis"],
				agents: ["Anthony"],
				sample: false,
			},
			{
				id: "bo-privacy-policy",
				title: "Write or update a privacy policy",
				class: "task",
				summary:
					"Anthony produces a compliant policy without a billable-hours legal review for a routine update, framed as a first draft for counsel to confirm.",
				skills: ["pm-toolkit:privacy-policy", "product-skills:legal-compliance"],
				agents: ["Anthony"],
				sample: false,
			},
			{
				id: "bo-nda",
				title: "Draft an NDA for a new vendor or partner",
				class: "task",
				summary:
					"Anthony turns around same-day paperwork for a routine deal, so a standard NDA doesn't wait on outside counsel.",
				skills: ["pm-toolkit:draft-nda"],
				agents: ["Anthony"],
				sample: false,
			},
			{
				id: "bo-grammar-pass",
				title: "Run a clarity pass on an external-facing document",
				class: "task",
				summary:
					"Wags polishes an external-facing document for grammar and clarity and runs it through a de-AI pass, so it reads clean and human without a separate editing round.",
				skills: ["pm-toolkit:grammar-check", "bopen-tools:humanize"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-board-prep",
				title: "Triage the inbox and prep for a board meeting",
				class: "task",
				summary:
					"Tina pulls the relevant threads, docs, metrics, and open questions so you walk into the board meeting with the full picture already assembled the day before.",
				skills: ["bopen-tools:notebooklm"],
				agents: ["Tina"],
				sample: false,
			},
			{
				id: "bo-competitor-scan",
				title: "Run a weekly competitor and market scan",
				class: "task",
				summary:
					"Parker pulls a cited weekly read on competitor moves and market sentiment from real social signal, so positioning reacts to what's actually happening.",
				skills: ["pm-market-research:competitor-analysis", "bopen-tools:x-research"],
				agents: ["Parker"],
				sample: false,
			},
			{
				id: "bo-swot",
				title: "Run a SWOT analysis ahead of a board strategy session",
				class: "task",
				summary:
					"Wags produces a structured strategic input the board can actually work from, ahead of a strategy session.",
				skills: ["pm-product-strategy:swot-analysis"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-premortem",
				title: "Run a pre-mortem before a major launch",
				class: "task",
				summary:
					"Wags surfaces the likely failure modes before the launch, so the plan carries a mitigation for each one the team can point to when something wobbles.",
				skills: ["pm-execution:pre-mortem"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-lean-canvas",
				title: "Draft a lean canvas for a new product idea",
				class: "task",
				summary:
					"Wags produces a one-page validation of a new idea before committing resources, so a concept gets stress-tested on paper first.",
				skills: ["pm-product-strategy:lean-canvas"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-market-sizing",
				title: "Run a TAM/SAM/SOM market-sizing exercise",
				class: "task",
				summary:
					"Wags produces a defensible market-size number for the deck, with every assumption behind the TAM/SAM/SOM figures shown so an investor can check the math.",
				skills: ["pm-market-research:market-sizing"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-pricing-onepager",
				title: "Build a pricing-strategy one-pager",
				class: "task",
				summary:
					"Wags produces a defensible pricing rationale covering tiers, the value metric, packaging, and the offer structure, each choice tied to a reason you can defend in a pricing review.",
				skills: ["pm-product-strategy:pricing-strategy"],
				agents: ["Wags"],
				sample: false,
			},
			{
				id: "bo-quarterly-chain",
				title: "Chief to Wags to Milton: quarterly plan to sprint execution to budget",
				class: "chain",
				summary:
					"Chief sets the objectives, Wags turns them into a costed sprint plan in Linear, and Milton reconciles the budget, so the quarter's strategy lands as funded issues a team can start on Monday.",
				skills: [
					"pm-execution:brainstorm-okrs",
					"bopen-tools:linear-planning",
					"bopen-tools:cost-tracking",
				],
				agents: ["Chief", "Wags", "Milton"],
				sample: true,
			},
			{
				id: "bo-compliance-comms-chain",
				title: "Tina to Anthony to Martha: meeting risk to policy to broadcast",
				class: "chain",
				summary:
					"A compliance risk raised in a meeting doesn't die in the notes: Tina flags it, Anthony drafts the policy, and Martha broadcasts the update — so the issue becomes policy and gets communicated.",
				skills: [
					"pm-execution:summarize-meeting",
					"product-skills:legal-compliance",
					"internal-comms",
				],
				agents: ["Tina", "Anthony", "Martha"],
				sample: false,
			},
			{
				id: "bo-feature-validation-chain",
				title: "Wags to Caal to Parker: feature idea to GTM to competitive validation",
				class: "chain",
				summary:
					"A new feature idea gets stress-tested against the market before a line of code: Wags shapes the opportunity, Caal frames the go-to-market, and Parker validates it against real competitors.",
				skills: [
					"pm-product-discovery:opportunity-solution-tree",
					"pm-go-to-market:gtm-strategy",
					"pm-market-research:competitor-analysis",
				],
				agents: ["Wags", "Caal", "Parker"],
				sample: false,
			},
			{
				id: "bo-cost-investor-chain",
				title: "Milton to Chief to Tina: cost anomaly to reprioritization to investor note",
				class: "chain",
				summary:
					"A spend spike gets explained to investors before they ask: Milton catches the anomaly, Chief reprioritizes, and Tina turns it into an investor-ready communication.",
				skills: ["bopen-tools:cost-tracking"],
				agents: ["Milton", "Chief", "Tina"],
				sample: false,
			},
			{
				id: "bo-soc2-remediation-chain",
				title: "Anthony to Paul to Milton: SOC 2 gap to control validation to funded remediation",
				class: "chain",
				summary:
					"A compliance gap becomes funded remediation work: Anthony finds the gap, Paul validates the technical control, and Milton budgets the fix so the work has money and an owner attached.",
				skills: ["product-skills:soc2-gap-analysis", "bopen-tools:cost-tracking"],
				agents: ["Anthony", "Paul", "Milton"],
				sample: false,
			},
			{
				id: "bo-company-profile",
				title: "Company profile: mission, stage, metrics, org chart",
				class: "foundation",
				summary:
					"A fill-in-the-blank profile every agent reads before any task, so the whole staff starts from the same picture of the company's mission, stage, metrics, and org chart.",
				skills: ["bopen-tools:runtime-context"],
				agents: ["Chief"],
				sample: false,
			},
			{
				id: "bo-compliance-profile",
				title: "Compliance profile: frameworks, data handled, vendors, DPA status",
				class: "foundation",
				summary:
					"Anthony and Paul document the frameworks pursued, data handled, vendor list, and DPA status, so legal and security work starts from one current record both teams cite.",
				skills: ["product-skills:legal-compliance"],
				agents: ["Anthony", "Paul"],
				sample: false,
			},
			{
				id: "bo-ops-cadence-manifest",
				title: "Ops cadence manifest: meeting rhythm, planning cycle, reporting cadence",
				class: "foundation",
				summary:
					"Wags and Tina document the actual meeting rhythm, planning-cycle length, reporting cadence, and tools of record, so planning playbooks run on the schedule your team already keeps.",
				skills: ["bopen-tools:linear-planning", "pm-execution:sprint-plan"],
				agents: ["Wags", "Tina"],
				sample: false,
			},
			{
				id: "bo-financial-profile",
				title: "Financial profile: budget ceilings, approval thresholds, cost centers",
				class: "foundation",
				summary:
					"Milton documents budget ceilings, approval thresholds, cost centers, and sign-off owners, so cost reporting and budget chains route through your real approval structure.",
				skills: ["bopen-tools:cost-tracking"],
				agents: ["Milton"],
				sample: true,
			},
			{
				id: "bo-investor-profile",
				title: "Investor and board profile: composition, format preferences, cap table basics",
				class: "foundation",
				summary:
					"Chief and Tina document board composition, reporting-format preferences, cap-table basics, and meeting frequency, so board and investor updates match the format your specific board expects. Cap-table facts are filled in manually.",
				skills: ["gemskills:deck-creator"],
				agents: ["Chief", "Tina"],
				sample: false,
			},
		],
	},
	{
		slug: "payments-blockchain",
		productId: "pack-payments-blockchain",
		name: "Payments & Blockchain",
		tagline: "Money movement, identity, and on-chain rails.",
		plugins: [
			{
				name: "stripe",
				marketplace: "claude-plugins-official",
				install: "claude plugin install stripe@claude-plugins-official",
			},
			{
				name: "sigma-auth",
				marketplace: "b-open-io",
				install: "claude plugin install sigma-auth@b-open-io",
			},
			{
				name: "1sat",
				marketplace: "b-open-io",
				install: "claude plugin install 1sat@b-open-io",
			},
			{
				name: "gemskills",
				marketplace: "b-open-io",
				install: "claude plugin install gemskills@b-open-io",
			},
			{
				name: "bsv-skills",
				marketplace: "b-open-io",
				install: "claude plugin install bsv-skills@b-open-io",
			},
			{
				name: "x402",
				marketplace: "calgooon-x402",
				install:
					"claude plugin marketplace add calgooon/x402 && claude plugin install x402@calgooon-x402",
			},
			{
				name: "bopen-tools",
				marketplace: "b-open-io",
				install: "claude plugin install bopen-tools@b-open-io",
			},
			{
				name: "plugin-dev",
				marketplace: "claude-plugins-official",
				install: "claude plugin install plugin-dev@claude-plugins-official",
			},
			{
				name: "static-analysis",
				marketplace: "trailofbits",
				install: "claude plugin install static-analysis@trailofbits",
			},
			{
				name: "send-secret",
				marketplace: "danwag06",
				install: "claude plugin install send-secret@danwag06",
			},
			{
				name: "product-skills",
				marketplace: "b-open-io",
				install: "claude plugin install product-skills@b-open-io",
			},
		],
		playbooks: [
			{
				id: "pb-digital-storefront",
				title: "Ship a dispute-resistant digital product storefront",
				class: "blueprint",
				summary:
					"Mina, Theo, and Jerry build a guest-checkout storefront with webhook-driven fulfillment, access logging, and an optional wallet-native download gate — the proven pattern for selling digital products where fulfillment survives a closed tab and stays idempotent across retries.",
				skills: ["stripe:stripe-best-practices", "stripe:test-cards", "sigma-auth:setup-nextjs"],
				agents: ["Mina", "Theo", "Jerry"],
				sample: false,
			},
			{
				id: "pb-ordinals-launch",
				title: "Launch a 1Sat Ordinals collection: mint, list, marketplace, brand name",
				class: "blueprint",
				summary:
					"Uno Satoj, David, Lisa, and Theo take an NFT collection from art to live marketplace on BSV — generation, minting, marketplace listing, and a human-readable OpNS name — in one coordinated run. The UTXO-based 1Sat stack sidesteps EVM contract-audit costs entirely, since there's no Solidity reentrancy surface to audit.",
				skills: [
					"1sat:ordinals-create",
					"1sat:ordinals-marketplace",
					"1sat:opns",
					"1sat:wallet-setup",
					"gemskills:generate-image",
				],
				agents: ["Uno Satoj", "David", "Lisa", "Theo"],
				sample: false,
			},
			{
				id: "pb-usage-billing",
				title: "Build a usage-based billing platform with metering and dunning",
				class: "blueprint",
				summary:
					"Mina, Idris, and Theo build a metered-billing system that keeps the usage source of truth in your own database, so changing what you meter never forces a re-integration, with dunning and guardrails against runaway pre-invoice exposure.",
				skills: ["stripe:stripe-best-practices", "stripe:upgrade-stripe"],
				agents: ["Mina", "Idris", "Theo"],
				sample: false,
			},
			{
				id: "pb-bitcoin-identity-platform",
				title: "Build a Bitcoin-native identity platform with wallet OAuth and SSO",
				class: "blueprint",
				summary:
					"Siggy, David, and Theo replace password auth with wallet-native OAuth, BAP identity onboarding, and a self-hosted TokenPass identity server — nonce validation, domain binding, and expiration enforcement included. The packaged BSV answer to the SIWE-style wallet-auth demand that matured on Ethereum first.",
				skills: [
					"sigma-auth:setup-nextjs",
					"bsv-skills:create-bap-identity",
					"sigma-auth:tokenpass",
				],
				agents: ["Siggy", "David", "Theo"],
				sample: false,
			},
			{
				id: "pb-agent-commerce",
				title: "Stand up agent-to-agent commerce: paid x402 API plus on-chain identity",
				class: "blueprint",
				summary:
					"Stand up agent-to-agent commerce on BSV rails: the x402 skill wires BRC-31 authenticated requests and BRC-29 payments over the x-bsv-payment header, paired with ClawNet identity so every paying agent is attributable. Requires MetaNet Client; this is the BSV-native x402, a different protocol from Coinbase's EVM x402.",
				skills: ["x402:x402", "bopen-tools:clawnet-cli", "bsv-skills:create-bap-identity"],
				agents: ["Mina", "David", "Uno Satoj"],
				sample: false,
			},
			{
				id: "pb-stripe-checkout",
				title: "Add Stripe Checkout and subscription billing to an existing app",
				class: "feature",
				summary:
					"Mina and Theo wire working subscription tiers with correct webhook-based provisioning, fulfilling off checkout.session.completed with idempotency so a customer who closes the tab mid-redirect still gets provisioned.",
				skills: ["stripe:stripe-best-practices"],
				agents: ["Mina", "Theo"],
				sample: false,
			},
			{
				id: "pb-stripe-connect",
				title: "Wire up Stripe Connect marketplace payouts and seller onboarding",
				class: "feature",
				summary:
					"Mina builds split payments where sellers onboard, get KYC'd, and get paid, with refund attribution and payout timing handled correctly — the parts of a marketplace Connect gives building blocks for but doesn't solve. Note Connect's geographic gaps before committing.",
				skills: ["stripe:connect-recommend", "stripe:stripe-best-practices"],
				agents: ["Mina"],
				sample: false,
			},
			{
				id: "pb-passkey-wallet-auth",
				title: "Add passkey + Bitcoin wallet auth to an existing app",
				class: "feature",
				summary:
					"Siggy and Theo let users sign in with a Bitcoin wallet signature, alongside passwords or on its own, built on Sigma Identity's tested nonce, domain, expiration, and replay validation.",
				skills: ["sigma-auth:setup-nextjs", "bsv-skills:message-signing"],
				agents: ["Siggy", "Theo"],
				sample: false,
			},
			{
				id: "pb-plaid-ach",
				title: "Connect Plaid for bank-linked payments and ACH",
				class: "feature",
				summary:
					"Mina wires bank account verification and ACH pulls with a proper Plaid Link flow, so bank-linked payments work without a fragile hand-built integration.",
				skills: ["bopen-tools:plaid-integration"],
				agents: ["Mina"],
				sample: false,
			},
			{
				id: "pb-x402-gate",
				title: "Add an x402 paid-API gate to an MCP server or endpoint",
				class: "feature",
				summary:
					"Put a per-request BSV paywall in front of any API endpoint using the x402 skill's payment-required handshake (BRC-31 auth + BRC-29 payment over the x-bsv-payment header). Buyers get a working gated endpoint with honest 402 responses and receipt verification. BSV-native x402; Coinbase's EVM protocol of the same name is a different system.",
				skills: ["x402:x402", "plugin-dev:mcp-integration"],
				agents: ["Mina", "Orbit"],
				sample: false,
			},
			{
				id: "pb-bsv-wallet-checkout",
				title: "Add BSV/1Sat wallet payments as a checkout option",
				class: "feature",
				summary:
					"David and Mina add native BRC-100 BSV wallet checkout alongside card payments, so users can pay on-chain directly without a card network in the loop.",
				skills: ["bsv-skills:wallet-brc100", "bsv-skills:wallet-send-bsv"],
				agents: ["David", "Mina"],
				sample: false,
			},
			{
				id: "pb-mnee-payments",
				title: "Add MNEE stablecoin payments to an app",
				class: "feature",
				summary:
					"Uno Satoj adds USD-denominated payments settled on BSV without card-network fees, using the MNEE stablecoin with balance, transfer, and cosign handling.",
				skills: ["1sat:mnee", "1sat:payments"],
				agents: ["Uno Satoj"],
				sample: false,
			},
			{
				id: "pb-bap-identity-verify",
				title: "Add on-chain BAP identity verification to a user flow",
				class: "feature",
				summary:
					"David and Siggy add verified, portable, cryptographically provable user identity to a flow, with diagnostics for when a bitcoin-auth token fails to verify.",
				skills: ["bsv-skills:create-bap-identity", "sigma-auth:bitcoin-auth-diagnostics"],
				agents: ["David", "Siggy"],
				sample: false,
			},
			{
				id: "pb-device-auth",
				title: "Add a device-authorization flow for CLI and desktop sign-in",
				class: "feature",
				summary:
					"Siggy gives CLI and desktop apps a browser-free RFC 8628 device-code sign-in flow through Sigma Identity, so command-line tools get real auth without embedding a browser.",
				skills: ["sigma-auth:device-authorization"],
				agents: ["Siggy"],
				sample: false,
			},
			{
				id: "pb-usage-meters",
				title: "Add usage-based billing meters to an existing SaaS product",
				class: "feature",
				summary:
					"Mina and Idris wire per-unit billing with a DB-backed source of truth, so changing what you measure is a query change on your side and never a Stripe re-integration.",
				skills: ["stripe:stripe-best-practices"],
				agents: ["Mina", "Idris"],
				sample: false,
			},
			{
				id: "pb-refund-dispute",
				title: "Add a refund and dispute-handling workflow with evidence bundling",
				class: "feature",
				summary:
					"Mina and Maxim add automated refund logic and chargeback evidence bundling — download timestamps and file IDs — since digital-download processing is treated as higher chargeback risk.",
				skills: ["stripe:explain-error", "stripe:stripe-best-practices"],
				agents: ["Mina", "Maxim"],
				sample: false,
			},
			{
				id: "pb-dapp-connect",
				title: "Add a dApp wallet-connect flow to a 1Sat/BSV web app",
				class: "feature",
				summary:
					"Uno Satoj lets users connect their 1Sat wallet to the app the way they'd connect MetaMask on EVM, so on-chain features work against the user's own wallet.",
				skills: ["1sat:dapp-connect"],
				agents: ["Uno Satoj"],
				sample: false,
			},
			{
				id: "pb-webhook-audit",
				title: "Audit a payment webhook handler for idempotency and signature gaps",
				class: "task",
				summary:
					"Jerry and Mina return a concrete list of retry-storm and double-fulfillment risks — missing idempotency keys, unverified signatures, slow work in the handler — fixed. Webhooks are the single biggest self-inflicted-wound category in payment integrations.",
				skills: ["stripe:explain-error", "static-analysis:semgrep"],
				agents: ["Jerry", "Mina"],
				sample: false,
			},
			{
				id: "pb-decode-tx",
				title: "Decode and audit a raw BSV transaction or BEEF payload",
				class: "task",
				summary:
					"David returns a human-readable breakdown of a transaction or BEEF payload for support and debugging, so an opaque hex blob becomes something you can reason about.",
				skills: ["bsv-skills:decode-bsv-transaction"],
				agents: ["David"],
				sample: false,
			},
			{
				id: "pb-fee-estimate",
				title: "Estimate BSV transaction fees and optimize UTXO batching",
				class: "task",
				summary:
					"David lowers per-transaction cost with a correct fee and batching strategy, so a BSV app isn't overpaying on every send or fragmenting its UTXO set.",
				skills: ["bsv-skills:estimate-transaction-fee"],
				agents: ["David"],
				sample: false,
			},
			{
				id: "pb-key-rotation",
				title: "Rotate BAP identity signing keys after a suspected compromise",
				class: "task",
				summary:
					"David performs a clean key rotation that preserves existing attestations, so a suspected compromise is contained and the identity stays intact through the rotation.",
				skills: ["bsv-skills:key-derivation", "bsv-skills:manage-bap-backup"],
				agents: ["David"],
				sample: false,
			},
			{
				id: "pb-wallet-backup",
				title: "Encrypt and back up a BSV wallet",
				class: "task",
				summary:
					"David produces a recoverable, encrypted wallet backup file with bitcoin-backup, so funds aren't one lost laptop away from gone.",
				skills: ["bsv-skills:encrypt-decrypt-backup"],
				agents: ["David"],
				sample: false,
			},
			{
				id: "pb-address-lookup",
				title: "Look up a BSV address's balance and UTXO history for reconciliation",
				class: "task",
				summary:
					"David reconciles on-chain balances and UTXO history against your internal ledger, so accounting matches the chain to the satoshi at close of each period.",
				skills: ["bsv-skills:lookup-bsv-address"],
				agents: ["David"],
				sample: false,
			},
			{
				id: "pb-price-widget",
				title: "Check the BSV price and build a live price-feed widget",
				class: "task",
				summary:
					"David surfaces a live BSV/USD rate in-app, so pricing and balances display in a currency users understand.",
				skills: ["bsv-skills:check-bsv-price"],
				agents: ["David"],
				sample: false,
			},
			{
				id: "pb-auth-diagnostics",
				title: "Diagnose bitcoin-auth token verification failures",
				class: "task",
				summary:
					"Siggy root-causes an auth failure and turns an intermittent sign-in bug into a named cause with a fix you can verify.",
				skills: ["sigma-auth:bitcoin-auth-diagnostics"],
				agents: ["Siggy"],
				sample: false,
			},
			{
				id: "pb-sweep",
				title: "Sweep a legacy wallet's UTXOs into a new 1Sat wallet",
				class: "task",
				summary:
					"Uno Satoj consolidates funds from a legacy wallet into a new 1Sat wallet with nothing left stranded, so a migration doesn't quietly abandon dust or an unspent output.",
				skills: ["1sat:sweep"],
				agents: ["Uno Satoj"],
				sample: true,
			},
			{
				id: "pb-opns-register",
				title: "Register an OpNS human-readable name for a wallet or brand",
				class: "task",
				summary:
					"Uno Satoj registers a memorable on-chain name so people send to a readable handle that resolves to the wallet on-chain.",
				skills: ["1sat:opns"],
				agents: ["Uno Satoj"],
				sample: false,
			},
			{
				id: "pb-timelock",
				title: "Time-lock BSV funds for vesting or escrow",
				class: "task",
				summary:
					"Uno Satoj provably locks funds until a release condition, so a vesting or escrow arrangement is enforced by the script itself and anyone can verify the lock on-chain.",
				skills: ["1sat:locks"],
				agents: ["Uno Satoj"],
				sample: false,
			},
			{
				id: "pb-junglebus",
				title: "Subscribe to real-time BSV transaction events via JungleBus",
				class: "task",
				summary:
					"David wires a live event stream into app logic, so the app reacts to on-chain activity the moment a relevant transaction confirms.",
				skills: ["bsv-skills:junglebus"],
				agents: ["David"],
				sample: false,
			},
			{
				id: "pb-secret-handoff",
				title: "Securely hand off a live API key or BAP backup passphrase",
				class: "task",
				summary:
					"Maxim gets a Stripe secret, Plaid client secret, or BAP backup passphrase to a teammate without it ever touching chat logs, using an encrypted peer-to-peer handoff.",
				skills: ["send-secret:send-secret-file"],
				agents: ["Maxim"],
				sample: false,
			},
			{
				id: "pb-tokens-deploy",
				title: "Deploy a BSV21 token with supply and metadata",
				class: "task",
				summary:
					"Uno Satoj deploys a BSV21 token with correct supply and metadata on the 1Sat stack, so a token launch is a configured deploy with the parameters set and verified before broadcast.",
				skills: ["1sat:tokens"],
				agents: ["Uno Satoj"],
				sample: false,
			},
			{
				id: "pb-mint-ordinal",
				title: "Generate art and mint it as a single ordinal",
				class: "task",
				summary:
					"Uno Satoj and Lisa generate an image and mint it as a 1Sat ordinal in one sitting, so a one-off inscription doesn't require a separate art and minting pipeline.",
				skills: ["1sat:ordinals-create", "gemskills:generate-image"],
				agents: ["Uno Satoj", "Lisa"],
				sample: false,
			},
			{
				id: "pb-money-chain",
				title: "Money chain: wallet-auth signup, Stripe subscription, BSV payout",
				class: "chain",
				summary:
					"Mina, Siggy, and David cover signup, billing, and payout across both rails in one coordinated run — wallet-auth signup, subscription billing, and BSV payout settlement — so the full money loop is built once with clean handoffs.",
				skills: [
					"sigma-auth:setup-nextjs",
					"stripe:stripe-best-practices",
					"bsv-skills:wallet-send-bsv",
				],
				agents: ["Mina", "Siggy", "David"],
				sample: false,
			},
			{
				id: "pb-launch-chain",
				title: "Launch chain: generate art, mint as ordinal, list on storefront",
				class: "chain",
				summary:
					"Uno Satoj, Lisa, and Theo take an NFT from prompt to live marketplace listing in one handoff sequence — Lisa generates the art, Uno Satoj mints it, Theo lists it — so a single-item drop ships without stitching three tools together.",
				skills: ["gemskills:generate-image", "1sat:ordinals-create", "1sat:ordinals-marketplace"],
				agents: ["Uno Satoj", "Lisa", "Theo"],
				sample: true,
			},
			{
				id: "pb-ship-chain",
				title: "Ship chain: build payouts, security-audit the webhook, deploy correctly",
				class: "chain",
				summary:
					"Mina builds the payout flow, Jerry security-audits the webhook, and Root deploys with env vars set correctly, so payout code is reviewed and shipped without a corrupted key from a bad heredoc.",
				skills: [
					"stripe:connect-recommend",
					"static-analysis:semgrep",
					"bopen-tools:devops-scripts",
				],
				agents: ["Mina", "Jerry", "Root"],
				sample: false,
			},
			{
				id: "pb-compliance-chain",
				title: "Compliance chain: classify token exposure, then gate the mint",
				class: "chain",
				summary:
					"Anthony frames the legal exposure of a token launch, David builds the identity gate, and Siggy enforces it, so the legal framing is settled and the gate is live before the mint button ever ships.",
				skills: [
					"product-skills:legal-compliance",
					"bsv-skills:create-bap-identity",
					"sigma-auth:setup-nextjs",
				],
				agents: ["Anthony", "David", "Siggy"],
				sample: false,
			},
			{
				id: "pb-reconciliation-chain",
				title: "Reconciliation chain: build metering, design the ledger, report revenue",
				class: "chain",
				summary:
					"Mina builds the metering, Idris designs the usage ledger, and Milton reports revenue, so metered usage and reported revenue reconcile to the same numbers across every system in the chain.",
				skills: ["stripe:stripe-best-practices", "bopen-tools:cost-tracking"],
				agents: ["Mina", "Idris", "Milton"],
				sample: false,
			},
			{
				id: "pb-rails-manifest",
				title: "Payment rails manifest: processors, test vs live, settlement currencies",
				class: "foundation",
				summary:
					"Mina documents which processors are in use, the test-versus-live boundaries, and settlement currencies, so staff always know which processor, chain, and mode apply before touching a payment.",
				skills: ["stripe:stripe-directory"],
				agents: ["Mina"],
				sample: false,
			},
			{
				id: "pb-custody-policy",
				title: "Custody and key-management policy: self-custody vs MPC vs third-party",
				class: "foundation",
				summary:
					"David and Siggy write down the custody stance — self-custody, MPC, or third-party — with spending limits, rate limits, approval flows, and address allow-listing, so key handling follows a written policy every operator can point to during an incident.",
				skills: ["bsv-skills:key-derivation"],
				agents: ["David", "Siggy"],
				sample: true,
			},
			{
				id: "pb-compliance-profile",
				title: "Compliance profile: money-transmitter exposure, KYC thresholds, token stance",
				class: "foundation",
				summary:
					"Anthony and Mina document the buyer's regulatory posture — money-transmitter exposure, KYC thresholds, token-classification stance — so staff know the constraints before proposing a payment or token feature.",
				skills: ["product-skills:legal-compliance"],
				agents: ["Anthony", "Mina"],
				sample: false,
			},
			{
				id: "pb-agent-payment-policy",
				title: "Agent-to-agent payment policy: x402 spend limits, funding, identity rules",
				class: "foundation",
				summary:
					"Write the payment policy your autonomous agents operate under: spend ceilings per task and per day, counterparty allow-lists keyed to ClawNet/BAP identity, receipt retention, and the escalation path when a payment request exceeds policy. A fill-in foundation document that the x402 and payments playbooks reference at run time.",
				skills: ["x402:x402", "bopen-tools:clawnet-cli"],
				agents: ["Mina", "David"],
				sample: false,
			},
		],
	},
] satisfies PackCatalogEntry[]

export const PACK_BY_SLUG = new Map(PACK_CATALOG.map((pack) => [pack.slug, pack]))
