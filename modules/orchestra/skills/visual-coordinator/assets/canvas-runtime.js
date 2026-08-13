/**
 * Canvas runtime for a visual-coordinator artifact.
 *
 * Owns state and spec emission only — no styling and no layout, so each
 * artifact keeps its own visual identity while the machinery below stays
 * identical. Inline this in the page and drive it from the markup.
 *
 * Wiring contract:
 *   VC.init({ harness, lanes, models, roster, workflow })
 *   Controls carry data-node="<id>" plus data-field="model|effort|agentType|lane"
 *   Dials carry data-setting="concurrency|isolation|gate"
 *   The copy button carries data-vc="copy"
 *   An element with data-vc="warnings" receives refusal notices
 */
(function (global) {
  "use strict";

  const VC = {
    env: null,
    workflow: null,

    init(config) {
      this.env = {
        harness: config.harness,
        lanes: config.lanes || {},
        models: config.models || {},
        roster: config.roster || [],
        caps: config.caps || {},
        nativeWorkflow: !!config.native_workflow,
      };
      this.workflow = config.workflow;
      this.bind();
      this.refresh();
      return this;
    },

    concurrencyCap() {
      if (this.env.caps && this.env.caps.live_children) {
        return this.env.caps.live_children;
      }
      if (this.env.harness === "claude-code") return 16;
      if (this.env.harness === "grok") return 32;
      return 6;
    },

    /**
     * A node is native when its lane matches the host harness. Anything else is
     * a subprocess of another vendor's CLI — no harness executes a foreign
     * model as a first-class step, so this distinction decides both how the
     * node renders and how it is emitted.
     */
    isNative(node) {
      const laneToHarness = {
        claude: "claude-code",
        codex: "codex",
        grok: "grok",
      };
      return laneToHarness[node.lane || "claude"] === this.env.harness;
    },

    /**
     * A Grok native node whose model is not a Grok id cannot stay native.
     * Sol belongs on the Codex list the detector already read. If the model
     * is on no detected lane, omit it rather than emit a dead configuration.
     */
    resolved(node) {
      const base = {
        id: node.id,
        label: node.label,
        model: node.model,
        effort: node.effort,
        task: node.task || "",
      };
      if (!this.isNative(node)) {
        return {
          ...base,
          kind: "shell-out",
          lane: node.lane,
          command: this.composeCommand(node),
        };
      }
      const grokModels = this.modelsFor("grok");
      if (
        this.env.harness === "grok" &&
        node.model &&
        grokModels.length &&
        !grokModels.includes(node.model)
      ) {
        let lane = null;
        if (this.modelsFor("codex").includes(node.model)) lane = "codex";
        else if (this.modelsFor("claude").includes(node.model)) lane = "claude";
        if (!lane) {
          return { ...base, kind: "omit", reason: `${node.model} is not on any detected lane` };
        }
        const remapped = { ...node, lane, command: "" };
        return {
          ...base,
          kind: "shell-out",
          lane,
          command: this.composeCommand(remapped),
          converted: true,
        };
      }
      return {
        ...base,
        kind: "agent",
        agentType: node.agentType || null,
        schema: node.schema || null,
      };
    },

    /**
     * Fields a shell-out node cannot carry.
     *
     * Effort is NOT one of them. Codex takes `model_reasoning_effort` and Grok
     * takes `--reasoning-effort`, so a subprocess carries effort as a command
     * line flag and the control must stay live. What a shell-out cannot carry
     * is a roster `agentType` — the palette holds this harness's agents, not
     * the other tool's — or a `schema`, which is the host runtime's mechanism
     * for forcing a structured return.
     */
    nativeOnlyFields: ["schema", "agentType"],

    fieldEnabled(node, field) {
      if (this.isNative(node)) return true;
      return !this.nativeOnlyFields.includes(field);
    },

    fieldDisabledReason(field) {
      return `${field} applies to a native step; this node is a subprocess of another CLI.`;
    },

    /**
     * How each lane spells reasoning effort on the command line, so the setting
     * reaches the tool instead of sitting unread in the spec.
     */
    effortFlag(lane, effort) {
      if (!effort) return "";
      if (lane === "codex") return ` -c model_reasoning_effort="${effort}"`;
      if (lane === "grok") return ` --reasoning-effort ${effort}`;
      return "";
    },

    /**
     * Compose a shell-out invocation when the author has not written one. An
     * empty command emits as "compose at dispatch", which hands the decision
     * back to the agent and discards the model and effort chosen here.
     */
    composeCommand(node, cwd) {
      if (node.command) return node.command;
      const dir = cwd || (this.workflow && this.workflow.cwd) || ".";
      const task = (node.task || "").replace(/"/g, '\\"');
      const effort = this.effortFlag(node.lane, node.effort);
      if (node.lane === "codex") {
        return `codex exec --sandbox workspace-write --cd ${dir} -m "${node.model}"${effort} "${task}"`;
      }
      if (node.lane === "grok") {
        return `grok --single "${task}" -m "${node.model}"${effort} --permission-mode acceptEdits --sandbox workspace --cwd ${dir}`;
      }
      return `claude -p "${task}"`;
    },

    modelsFor(lane) {
      return this.env.models[lane] || [];
    },

    effortsFor(lane) {
      return this.env.models[`${lane}_effort`] || [];
    },

    eachNode(fn) {
      for (const phase of this.workflow.phases) {
        for (const node of phase.nodes) fn(node, phase);
      }
    },

    nodeById(id) {
      let found = null;
      this.eachNode((n) => {
        if (n.id === id) found = n;
      });
      return found;
    },

    bind() {
      document.addEventListener("change", (event) => {
        const el = event.target;
        const nodeId = el.getAttribute && el.getAttribute("data-node");
        if (nodeId) {
          const node = this.nodeById(nodeId);
          if (!node) return;
          const field = el.getAttribute("data-field");
          node[field] = el.value;
          // Switching lane invalidates a model chosen from the old lane's list.
          if (field === "lane" && !this.modelsFor(el.value).includes(node.model)) {
            node.model = this.modelsFor(el.value)[0] || "";
          }
          this.syncNode(nodeId);
          this.refresh();
          if (typeof this.onNodeChange === "function") this.onNodeChange(node, field);
          return;
        }
        const setting = el.getAttribute && el.getAttribute("data-setting");
        if (setting) {
          this.workflow[setting] =
            setting === "concurrency" ? Number(el.value) : el.value;
          this.refresh();
        }
      });

      const copy = document.querySelector('[data-vc="copy"]');
      if (copy) {
        copy.addEventListener("click", () => {
          const text = this.emit();
          navigator.clipboard.writeText(text).catch(() => {});
          const out = document.querySelector('[data-vc="output"]');
          if (out) out.value = text;
          copy.textContent = "Copied";
          setTimeout(() => {
            copy.textContent = "Copy the plan";
          }, 1600);
        });
      }
    },

    /**
     * Settings the host cannot honour are reported rather than silently
     * dropped. A configuration that looks applied but was discarded is the
     * failure mode this whole artifact exists to prevent.
     */
    warnings() {
      const out = [];
      const cap = this.concurrencyCap();
      if (this.workflow.concurrency > cap) {
        out.push(
          `Concurrency ${this.workflow.concurrency} exceeds the ${this.env.harness} cap of ${cap}; ${cap} will be emitted.`,
        );
      }
      if (this.env.harness === "grok") {
        for (const phase of this.workflow.phases) {
          if (phase.mode === "pipeline") {
            out.push(
              `${phase.title}: Grok has no pipeline(); this phase will emit as a barrier (parallel).`,
            );
          }
        }
      }
      this.eachNode((node) => {
        const lane = node.lane || "claude";
        if (!this.isNative(node) && this.env.lanes[lane] !== "available") {
          out.push(
            `${node.label}: the ${lane} CLI is not installed, so this shell-out cannot run here.`,
          );
        }
        if (node.model && !this.modelsFor(lane).includes(node.model)) {
          out.push(
            `${node.label}: ${node.model} is not offered by the ${lane} lane.`,
          );
        }
        if (
          this.isNative(node) &&
          this.env.harness === "grok" &&
          node.model &&
          !/^grok-/.test(node.model)
        ) {
          out.push(
            `${node.label}: ${node.model} cannot run as a native Grok step; emit it as a Codex or Claude shell-out.`,
          );
        }
        if (node.schema && !this.isNative(node)) {
          out.push(
            `${node.label}: structured output is a native-node feature; the schema will not be emitted.`,
          );
        }
      });
      return out;
    },

    /**
     * Re-scope only the dependent controls for one node. Switching lane changes
     * which models and efforts are legal, and rebuilding the whole canvas to
     * express that loses the user's place mid-edit.
     */
    syncNode(nodeId) {
      const node = this.nodeById(nodeId);
      if (!node) return;
      const lane = node.lane || "claude";
      const fill = (field, values) => {
        const el = document.querySelector(
          `[data-node="${nodeId}"][data-field="${field}"]`,
        );
        if (!el) return;
        const enabled = this.fieldEnabled(node, field);
        el.disabled = !enabled;
        el.title = enabled ? "" : this.fieldDisabledReason(field);
        if (el.tagName !== "SELECT") return;
        const current = node[field];
        el.innerHTML = values
          .map(
            (v) =>
              `<option${v === current ? " selected" : ""}>${String(v).replace(/</g, "&lt;")}</option>`,
          )
          .join("");
        if (!values.includes(current) && values.length) {
          node[field] = values[0];
          el.value = values[0];
        }
      };
      fill("model", this.modelsFor(lane));
      fill("effort", this.effortsFor(lane));
    },

    refresh() {
      const box = document.querySelector('[data-vc="warnings"]');
      if (!box) return;
      const warnings = this.warnings();
      box.innerHTML = warnings.length
        ? warnings.map((w) => `<li>${w.replace(/</g, "&lt;")}</li>`).join("")
        : "";
      box.setAttribute("data-empty", warnings.length ? "false" : "true");
    },

    /** Human-readable plan and machine block, generated from one state. */
    emit() {
      const w = this.workflow;
      const cap = this.concurrencyCap();
      const concurrency = Math.min(w.concurrency || cap, cap);
      const lines = [];

      lines.push(`# Workflow: ${w.name}`);
      lines.push(
        `Host harness: ${this.env.harness}   (fixed — set by how this session started)`,
      );
      lines.push(`Isolation: ${w.isolation}`);
      lines.push(`Concurrency: ${concurrency}`);
      lines.push("");
      lines.push("## Phases");

      w.phases.forEach((phase, i) => {
        lines.push("");
        const mode =
          this.env.harness === "grok" && phase.mode === "pipeline"
            ? "parallel"
            : phase.mode;
        lines.push(`### ${i + 1}. ${phase.title}  (${mode})`);
        for (const node of phase.nodes) {
          const resolved = this.resolved(node);
          if (resolved.kind === "omit") {
            lines.push(`- **${node.label}** — not emitted (${resolved.reason})`);
            continue;
          }
          if (resolved.kind === "agent") {
            const agent = this.env.roster.find((a) => a.id === node.agentType);
            const who = agent ? `${agent.display_name} (\`${agent.id}\`)` : "unassigned";
            lines.push(`- **${node.label}** — ${who}`);
            lines.push(`  model: ${resolved.model} · effort: ${resolved.effort}`);
          } else {
            const converted = resolved.converted ? " (converted from native)" : "";
            lines.push(`- **${node.label}** — SHELL-OUT to ${resolved.lane}${converted}`);
            lines.push(
              `  model: ${resolved.model} · effort: ${resolved.effort || "tool default"}`,
            );
            lines.push(`  command: ${resolved.command}`);
          }
          if (resolved.task) lines.push(`  ${resolved.task}`);
        }
      });

      lines.push("");
      lines.push("## Verification gate");
      lines.push(w.gate || "(none set — supply one before running)");

      const warnings = this.warnings();
      if (warnings.length) {
        lines.push("");
        for (const warning of warnings) lines.push(`Not emitted: ${warning}`);
      }

      const machine = {
        version: 1,
        harness: this.env.harness,
        name: w.name,
        isolation: w.isolation,
        concurrency,
        phases: w.phases.map((phase) => ({
          title: phase.title,
          mode:
            this.env.harness === "grok" && phase.mode === "pipeline"
              ? "parallel"
              : phase.mode,
          nodes: phase.nodes
            .map((node) => this.resolved(node))
            .filter((node) => node.kind !== "omit")
            .map((node) =>
              node.kind === "agent"
                ? {
                    id: node.id,
                    label: node.label,
                    kind: "agent",
                    agentType: node.agentType || null,
                    model: node.model,
                    effort: node.effort,
                    task: node.task || "",
                    schema: node.schema || null,
                  }
                : {
                    id: node.id,
                    label: node.label,
                    kind: "shell-out",
                    lane: node.lane,
                    model: node.model,
                    effort: node.effort || null,
                    command: node.command,
                    task: node.task || "",
                  },
            ),
        })),
        gate: w.gate || null,
      };

      lines.push("");
      lines.push("```json");
      lines.push(JSON.stringify(machine, null, 2));
      lines.push("```");
      return lines.join("\n");
    },
  };

  global.VC = VC;
})(window);
