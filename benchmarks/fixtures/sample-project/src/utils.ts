// Utility functions

// BUG: This regex doesn't handle unicode characters properly
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateInput(body: any): { valid: boolean; data?: any; errors?: string[] } {
  debugger; // Left from debugging session
  if (!body) {
    return { valid: false, errors: ["Empty body"] };
  }

  const errors: string[] = [];
  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    errors.push("Invalid email");
  }

  // TODO: Add phone number validation
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: body };
}

export function hashPassword(password: string): string {
  // This function takes a password parameter — it's NOT a hardcoded secret
  // The variable name "password" is expected here
  return Buffer.from(password).toString("base64");
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
