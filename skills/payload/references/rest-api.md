# Payload REST API Reference

For external access when Local API is not available.

## Authentication Options

### Session Token

Obtain via login, use in cookie:

```bash
curl -b "payload-token=YOUR_TOKEN" https://example.com/api/posts
```

### Payload Built-in API Keys

If enabled (`useAPIKey: true` on auth collection):

```bash
curl -H "Authorization: users API-Key YOUR_KEY" https://example.com/api/posts
```

**Note**: Many Payload sites use `payload-auth` or `better-auth` which may disable built-in API keys. Check the site's auth configuration.

## Endpoints

### List Documents

```bash
GET /api/{collection}?limit=100
```

### Get by ID

```bash
GET /api/{collection}/{id}
```

### Query by Field

```bash
GET /api/{collection}?where[field][equals]=value
```

### Create Document

```bash
POST /api/{collection}
Content-Type: application/json

{
  "field": "value",
  "_status": "published"
}
```

### Update Document

```bash
PATCH /api/{collection}/{id}
Content-Type: application/json

{
  "field": "new value"
}
```

### Delete Document

```bash
DELETE /api/{collection}/{id}
```

## Query Operators

| Operator | Example |
|----------|---------|
| equals | `where[status][equals]=published` |
| not_equals | `where[status][not_equals]=draft` |
| like | `where[title][like]=search` |
| contains | `where[tags][contains]=tech` |
| in | `where[category][in]=1,2,3` |
| greater_than | `where[views][greater_than]=100` |
| less_than | `where[views][less_than]=1000` |

## Pagination

```bash
GET /api/posts?limit=10&page=2
```

Response includes:
- `docs`: Array of documents
- `totalDocs`: Total count
- `totalPages`: Number of pages
- `page`: Current page
- `hasNextPage`: Boolean
- `hasPrevPage`: Boolean

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid JSON or missing required fields |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Collection or document not found |
| 500 | Server error |
