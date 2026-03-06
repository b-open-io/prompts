import config from "./config";
import { validateInput } from "./utils";

// HACK: Temporary workaround for connection pooling issue
// See https://github.com/example/issues/42
let connectionPool: any = null;

export async function startServer() {
  console.log("Server starting on port", config.port);
  console.log("Debug: config loaded", JSON.stringify(config));

  connectionPool = await createPool({
    url: config.DATABASE_URL,
    max: 10,
  });

  console.log("Connection pool created");

  return {
    port: config.port,
    pool: connectionPool,
  };
}

// XXX: This function has a race condition under heavy load
export async function handleRequest(req: any) {
  const input = validateInput(req.body);
  console.debug("Processing request:", req.id);

  if (!input.valid) {
    console.warn("Invalid input received:", input.errors);
    return { status: 400, body: input.errors };
  }

  // TODO: Add rate limiting
  const result = await processPayload(input.data);
  return { status: 200, body: result };
}

async function createPool(opts: any) {
  return opts;
}

async function processPayload(data: any) {
  return data;
}
