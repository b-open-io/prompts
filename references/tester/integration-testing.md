# Integration Testing Reference

## API Integration Tests

```typescript
describe('User API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create and retrieve user', async () => {
    const userData = { name: 'Test User', email: 'test@example.com' };
    const response = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);

    const userId = response.body.id;
    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body).toMatchObject(userData);
  });
});
```

## API Testing with Supertest

```typescript
describe('Auth endpoints', () => {
  it('should return 401 for protected routes without token', async () => {
    await request(app)
      .get('/api/protected')
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe('Unauthorized');
      });
  });
});
```

## Test Database Management

```typescript
export const setupTestDatabase = async () => {
  const testDb = `test_${Date.now()}`;
  await createDatabase(testDb);
  await runMigrations(testDb);
  process.env.DATABASE_URL = `postgresql://localhost/${testDb}`;
};

export const teardownTestDatabase = async () => {
  const dbName = extractDbName(process.env.DATABASE_URL);
  await dropDatabase(dbName);
};

// Transaction-based test isolation
export const withTestTransaction = async (testFn: () => Promise<void>) => {
  await db.$transaction(async (tx) => {
    await testFn();
    throw new Error('Rollback'); // Force rollback
  }).catch(() => {}); // Ignore rollback error
};
```

## Testcontainers (Go)

```go
func TestUserRepository_Integration(t *testing.T) {
    ctx := context.Background()

    container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "postgres:15",
            ExposedPorts: []string{"5432/tcp"},
            Env: map[string]string{
                "POSTGRES_PASSWORD": "password",
                "POSTGRES_DB":       "testdb",
            },
            WaitingFor: wait.ForLog("database system is ready"),
        },
        Started: true,
    })
    require.NoError(t, err)
    defer container.Terminate(ctx)

    host, _ := container.Host(ctx)
    port, _ := container.MappedPort(ctx, "5432")

    db := setupDatabase(host, port.Port())
    repo := NewUserRepository(db)

    user := &User{Name: "Test", Email: "test@example.com"}
    err = repo.Save(user)
    require.NoError(t, err)
    assert.NotEmpty(t, user.ID)
}
```

## Contract Testing with Pact (TypeScript)

```typescript
import { Pact } from '@pact-foundation/pact'

const provider = new Pact({
  consumer: 'OrderService',
  provider: 'ProductService'
})

describe('Product API', () => {
  beforeAll(() => provider.setup())
  afterAll(() => provider.finalize())

  test('should get product details', async () => {
    await provider.addInteraction({
      state: 'product exists',
      uponReceiving: 'a request for product details',
      withRequest: {
        method: 'GET',
        path: '/products/123'
      },
      willRespondWith: {
        status: 200,
        body: {
          id: '123',
          name: 'Test Product',
          price: 99.99
        }
      }
    })

    const product = await productService.getProduct('123')
    expect(product.name).toBe('Test Product')
  })
})
```
