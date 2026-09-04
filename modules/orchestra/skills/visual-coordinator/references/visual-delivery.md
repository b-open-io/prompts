# Visual delivery policy

A visual plan is complete only when the user can open it.

1. On Claude Code, publish the canvas as an Artifact.
2. On other hosts, load BitPlan's canonical skill (`bitplan:bitplan` from its
   plugin, or `bitplan` from a standalone install). Explain that BitPlan is an
   external provider and ask before uploading an encrypted draft.
3. Prefer an already available BRC-100 wallet. Do not point BitPlan at `1sat
   serve wallet`; that planned fallback is not yet application-compatible.
4. If no compatible wallet is available, open the local HTML file.
5. Only after the user explicitly declines the wallet paths may you offer
   PostPlan as an unencrypted hosted fallback. Explain the consequence and ask
   before uploading.

Never stop after writing an HTML path when the host can present a usable page.
Never upload a visual plan or its embedded repository context without the
required provider disclosure and approval.
