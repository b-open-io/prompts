import { describe, expect, test } from "bun:test";
import { clickExpression } from "./cdp";

// Evaluate the page-side expression against a stub `document`, the way
// Runtime.evaluate would run it in the tab.
function runClick(selector: string, found: boolean) {
	const seen: string[] = [];
	let clicks = 0;
	const document = {
		querySelector(sel: string) {
			seen.push(sel);
			return found
				? {
						textContent: "  Submit  ",
						click() {
							clicks++;
						},
					}
				: null;
		},
	};
	const value = new Function("document", `return ${clickExpression(selector)};`)(document);
	return { value, seen, clicks };
}

const selectors = [
	"#submit",
	"input[name='email']",
	'input[name="email"]',
	"button:not([aria-label='Close'])",
	"a[href$='\\\\']",
	"div[data-x='${1+1}']",
];

describe("clickExpression", () => {
	for (const selector of selectors) {
		test(`clicks the element for ${selector}`, () => {
			const { value, seen, clicks } = runClick(selector, true);
			expect(seen).toEqual([selector]);
			expect(clicks).toBe(1);
			expect(value).toBe("Clicked: Submit");
		});

		test(`reports a missing element for ${selector}`, () => {
			const { value, clicks } = runClick(selector, false);
			expect(clicks).toBe(0);
			expect(value).toBe(`Element not found: ${selector}`);
		});
	}
});
