# Unit Testing Reference

## Bun Test Configuration

```toml
# bunfig.toml
[test]
timeout = 30000
coverage = true
preload = ["./src/test/setup.ts"]
```

## AAA Pattern (Arrange / Act / Assert)

```typescript
import { test, expect, mock, beforeEach, describe } from "bun:test";

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      save: mock(() => Promise.resolve({ id: 1 })),
      findById: mock(() => Promise.resolve(null))
    };
    userService = new UserService(mockRepository);
  });

  test('should create user with valid data', async () => {
    // Arrange
    const userData = { name: 'John Doe', email: 'john@example.com' };
    mockRepository.save.mockResolvedValue({ id: 1, ...userData });

    // Act
    const result = await userService.createUser(userData);

    // Assert
    expect(result).toEqual({ id: 1, ...userData });
    expect(mockRepository.save).toHaveBeenCalledWith(userData);
  });
});
```

## Mock Strategies (Bun)

```typescript
import { mock } from "bun:test";

// Dependency injection for testing
export class OrderService {
  constructor(
    private paymentService: PaymentService,
    private inventoryService: InventoryService,
    private emailService: EmailService
  ) {}
}

// Factory for test doubles
export const createMockServices = () => ({
  paymentService: {
    processPayment: mock(() => Promise.resolve({ success: true })),
    refundPayment: mock(() => Promise.resolve({ refunded: true }))
  },
  inventoryService: {
    reserveItems: mock(() => Promise.resolve(true)),
    releaseItems: mock(() => Promise.resolve(true))
  },
  emailService: {
    sendConfirmation: mock(() => Promise.resolve())
  }
});

// Module mocking with Bun
mock.module('./utils', () => ({
  generateId: mock(() => 'test-id'),
  formatDate: mock((date) => date.toISOString())
}));
```

## Snapshot Testing (Bun)

```typescript
import { test, expect } from "bun:test";

// Component snapshots
test('renders user profile correctly', () => {
  const user = { name: 'John Doe', email: 'john@example.com' };
  const { container } = render(<UserProfile user={user} />);
  expect(container.firstChild).toMatchSnapshot();
});

// API response snapshots with inline matchers
test('returns correct user data structure', async () => {
  const response = await fetch('http://localhost:3000/api/users/1');
  const data = await response.json();
  expect(data).toMatchSnapshot({
    id: expect.any(Number),
    createdAt: expect.any(String)
  });
});
```

## Test Data Factories

```typescript
// Test data factories with faker
export const UserFactory = {
  build: (overrides?: Partial<User>): User => ({
    id: faker.datatype.number(),
    name: faker.name.fullName(),
    email: faker.internet.email(),
    createdAt: new Date(),
    ...overrides
  }),

  buildList: (count: number, overrides?: Partial<User>): User[] =>
    Array.from({ length: count }, () => UserFactory.build(overrides))
};

// Database seeding for tests
export const seedTestData = async () => {
  const users = UserFactory.buildList(10);
  await db.user.createMany({ data: users });

  const orders = users.map(user =>
    OrderFactory.build({ userId: user.id })
  );
  await db.order.createMany({ data: orders });
};
```

## React Testing Library

```typescript
// Test behavior, not implementation
it('should show error message on invalid form submission', async () => {
  render(<LoginForm />);

  await user.click(screen.getByRole('button', { name: /login/i }));

  expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
});

// With MSW for API mocking
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Provider Wrapper

```typescript
export const renderWithProviders = (ui: ReactElement) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClient>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClient>
    )
  });
};
```
