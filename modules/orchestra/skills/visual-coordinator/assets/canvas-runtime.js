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
      };
      this.workflow = config.workflow;
      this.bind();
      this.refresh();
      return this;
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
          this.refresh();
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
      const cap = this.env.harness === "claude-code" ? 16 : 6;
      if (this.workflow.concurrency > cap) {
        out.push(
          `Concurrency ${this.workflow.concurrency} exceeds the ${this.env.harness} cap of ${cap}; ${cap} will be emitted.`,
        );
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
        if (node.schema && !this.isNative(node)) {
          out.push(
            `${node.label}: structured output is a native-node feature; the schema will not be emitted.`,
          );
        }
      });
      return out;
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
      const cap = this.env.harness === "claude-code" ? 16 : 6;
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
        lines.push(`### ${i + 1}. ${phase.title}  (${phase.mode})`);
        for (const node of phase.nodes) {
          if (this.isNative(node)) {
            const agent = this.env.roster.find((a) => a.id === node.agentType);
            const who = agent ? `${agent.display_name} (\`${agent.id}\`)` : "unassigned";
            lines.push(`- **${node.label}** — ${who}`);
            lines.push(`  model: ${node.model} · effort: ${node.effort}`);
          } else {
            lines.push(`- **${node.label}** — SHELL-OUT to ${node.lane}`);
            lines.push(`  model: ${node.model}`);
            lines.push(`  command: ${node.command || "(compose at dispatch)"}`);
          }
          if (node.task) lines.push(`  ${node.task}`);
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
          mode: phase.mode,
          nodes: phase.nodes.map((node) =>
            this.isNative(node)
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
                  command: node.command || "",
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
