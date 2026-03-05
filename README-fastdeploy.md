# fastdeploy

> Deploy static sites to Amazon S3 in seconds.

A TypeScript CLI that syncs a local build directory to S3 with smart diffing, content-type inference, cache-control header mapping, and optional CloudFront invalidation — all in one command.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Configuration](#configuration)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

**Requires Node.js 18+ or Bun 1.0+.**

```bash
# bun (recommended)
bun add -g fastdeploy

# npm
npm install -g fastdeploy

# one-off without installing
bunx fastdeploy deploy --bucket my-site --dir ./dist
```

Verify the installation:

```bash
fastdeploy --version
```

> [!NOTE]
> AWS credentials must be available in your environment. `fastdeploy` resolves them from `~/.aws/credentials`, the standard `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables, or an IAM instance role — in that order.

---

## Quick Start

```bash
# 1. Scaffold a config file interactively
fastdeploy init

# 2. Preview what would change
fastdeploy diff --bucket my-site --dir ./dist

# 3. Deploy
fastdeploy deploy --bucket my-site --dir ./dist
```

---

## Usage

```
fastdeploy <command> [options]
```

### Commands

| Command      | Description                                        |
|:-------------|:---------------------------------------------------|
| `init`       | Interactively create a `fastdeploy.json` config    |
| `deploy`     | Sync a local directory to S3                       |
| `diff`       | Preview which files would be uploaded or deleted   |
| `invalidate` | Trigger a CloudFront invalidation manually         |

### `deploy` options

| Flag                  | Alias | Default           | Description                                           |
|:----------------------|:------|:------------------|:------------------------------------------------------|
| `--bucket <name>`     | `-b`  | —                 | Target S3 bucket name **(required)**                  |
| `--dir <path>`        | `-d`  | `./dist`          | Local directory to deploy                             |
| `--region <region>`   | `-r`  | `us-east-1`       | AWS region                                            |
| `--profile <name>`    |       | —                 | AWS credentials profile                               |
| `--prefix <prefix>`   | `-p`  | `""`              | Key prefix inside the bucket (e.g. `staging/`)        |
| `--delete`            |       | `false`           | Delete remote objects not present locally             |
| `--distribution-id`   |       | —                 | CloudFront distribution ID to invalidate after deploy |
| `--dry-run`           |       | `false`           | Print actions without uploading anything              |
| `--concurrency <n>`   |       | `10`              | Number of parallel uploads                            |
| `--config <path>`     | `-c`  | `fastdeploy.json` | Path to config file                                   |

### `invalidate` options

| Flag                | Type     | Default | Description                        |
|:--------------------|:---------|:--------|:-----------------------------------|
| `--distribution-id` | `string` | —       | CloudFront distribution ID         |
| `--paths`           | `string` | `/*`    | Comma-separated invalidation paths |

---

## Configuration

`fastdeploy` resolves settings in this priority order (highest first):

1. CLI flags
2. `fastdeploy.json` in the current directory
3. `fastdeploy` key inside `package.json`
4. Environment variables

### `fastdeploy.json`

```json
{
  "bucket": "my-site-bucket",
  "region": "us-east-1",
  "dir": "./dist",
  "prefix": "",
  "distributionId": "E1ABCDEF123456",
  "delete": true,
  "concurrency": 20,
  "cacheControl": {
    "**/*.html":          "no-cache, no-store, must-revalidate",
    "**/*.{js,css}":      "public, max-age=31536000, immutable",
    "**/*.{png,jpg,webp,svg}": "public, max-age=86400",
    "**/*":               "public, max-age=3600"
  },
  "contentType": {
    ".wasm": "application/wasm",
    ".avif": "image/avif"
  }
}
```

### `package.json` inline config

```json
{
  "fastdeploy": {
    "bucket": "my-site-bucket",
    "dir": "./out"
  }
}
```

### Environment variables

| Variable                     | Description                                |
|:-----------------------------|:-------------------------------------------|
| `AWS_ACCESS_KEY_ID`          | AWS access key                             |
| `AWS_SECRET_ACCESS_KEY`      | AWS secret key                             |
| `AWS_REGION`                 | AWS region                                 |
| `AWS_PROFILE`                | AWS credentials profile                    |
| `FASTDEPLOY_BUCKET`          | S3 bucket name                             |
| `FASTDEPLOY_DISTRIBUTION_ID` | CloudFront distribution ID                 |

### Cache-control patterns

The `cacheControl` map uses [glob patterns](https://github.com/micromatch/micromatch). Keys are evaluated top-to-bottom — the **first match wins**.

> [!IMPORTANT]
> Always set `no-cache` on `.html` files. This ensures browsers fetch the latest HTML (and therefore the latest asset fingerprints) on every deploy, even if the HTML byte content didn't change.

<details>
  <summary>Recommended pattern reference</summary>

  | Pattern                  | Value                                         | Why                                      |
  |:-------------------------|:----------------------------------------------|:-----------------------------------------|
  | `**/*.html`              | `no-cache, no-store, must-revalidate`         | Force re-fetch on every visit            |
  | `**/*.{js,css}`          | `public, max-age=31536000, immutable`         | Fingerprinted — safe to cache forever    |
  | `**/*.{png,jpg,webp,svg}`| `public, max-age=86400`                       | Static assets — 1-day cache              |
  | `**/service-worker.js`   | `no-cache, no-store, must-revalidate`         | Must always be fresh                     |
  | `**/*`                   | `public, max-age=3600`                        | Catch-all fallback — 1-hour cache        |

</details>

---

## Examples

### Basic deploy

```bash
fastdeploy deploy --bucket my-site --dir ./dist --region eu-west-1
```

### Deploy and remove stale files

```bash
fastdeploy deploy --bucket my-site --delete
```

### Deploy with CloudFront invalidation

```bash
fastdeploy deploy \
  --bucket my-site \
  --distribution-id E1ABCDEF123456 \
  --delete
```

### Preview changes before deploying

```bash
fastdeploy diff --bucket my-site --dir ./dist
```

```diff
+ assets/main.a1b2c3.js     (new)
~ index.html                 (changed)
- assets/main.old456.js      (deleted)

3 changes. Run `deploy` to apply.
```

### Deploy to a path prefix

Useful for hosting multiple sites in one bucket:

```bash
fastdeploy deploy --bucket my-org-bucket --prefix docs/ --dir ./docs/dist
```

### Use an alternate config file

```bash
fastdeploy deploy --config ./deploy/staging.json
```

### CI/CD — GitHub Actions

```yaml
- name: Deploy to S3
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  run: |
    bunx fastdeploy deploy \
      --bucket ${{ vars.S3_BUCKET }} \
      --distribution-id ${{ vars.CF_DIST_ID }} \
      --delete
```

---

## Contributing

Contributions are welcome. Please open an issue before submitting a large PR so we can align on approach.

### Development setup

```bash
git clone https://github.com/your-org/fastdeploy.git
cd fastdeploy
bun install
```

### Running locally

```bash
bun run src/index.ts deploy --help
```

### Running tests

```bash
bun test
```

### PR checklist

- [ ] Tests pass (`bun test`)
- [ ] New behaviour is covered by a test
- [ ] Linting passes (`bun run lint`)
- [ ] `CHANGELOG.md` is updated

### Commit style

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add --prefix flag for subdirectory deployments
fix: skip upload when remote ETag matches local hash
docs: add GitHub Actions example
chore: bump @aws-sdk/client-s3 to 3.x
```

### Reporting issues

Please include:

- fastdeploy version (`fastdeploy --version`)
- Node.js or Bun version
- Minimal reproduction steps
- Full error output (with `--debug` flag if available)

---

## IAM Permissions

Minimum required policy for a deploy with CloudFront invalidation:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-site-bucket"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-site-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1ABCDEF123456"
    }
  ]
}
```

Omit the `cloudfront:CreateInvalidation` statement if you don't use `--distribution-id`.

---

## License

MIT
