# Go Testing Reference

## Table-Driven Tests (Gold Standard)

```go
func TestAdd(t *testing.T) {
    tests := map[string]struct {
        a, b     int
        expected int
        wantErr  bool
    }{
        "positive numbers": {a: 2, b: 3, expected: 5, wantErr: false},
        "negative numbers": {a: -1, b: -2, expected: -3, wantErr: false},
        "zero values":      {a: 0, b: 0, expected: 0, wantErr: false},
        "overflow case":    {a: math.MaxInt, b: 1, expected: 0, wantErr: true},
    }

    for name, tc := range tests {
        t.Run(name, func(t *testing.T) {
            result, err := Add(tc.a, tc.b)

            if tc.wantErr {
                require.Error(t, err)
                return
            }

            require.NoError(t, err)
            assert.Equal(t, tc.expected, result)
        })
    }
}
```

## Testify Suite Pattern

```go
type UserServiceSuite struct {
    suite.Suite
    service *UserService
    mockDB  *MockDatabase
}

func (s *UserServiceSuite) SetupTest() {
    s.mockDB = &MockDatabase{}
    s.service = NewUserService(s.mockDB)
}

func (s *UserServiceSuite) TestCreateUser() {
    user := User{Name: "John", Email: "john@example.com"}
    s.mockDB.On("Save", &user).Return(nil)

    err := s.service.CreateUser(&user)

    require.NoError(s.T(), err)
    s.mockDB.AssertExpectations(s.T())
}

func TestUserServiceSuite(t *testing.T) {
    suite.Run(t, new(UserServiceSuite))
}
```

## GoMock for Interface Mocking

```go
//go:generate mockgen -source=user.go -destination=mocks/user_mock.go

func TestUserService_GetUser(t *testing.T) {
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockRepo := mocks.NewMockUserRepository(ctrl)
    service := NewUserService(mockRepo)

    mockRepo.EXPECT().
        GetUser(gomock.Eq("123")).
        Return(&User{ID: "123", Name: "John"}, nil).
        Times(1)

    user, err := service.GetUser("123")

    assert.NoError(t, err)
    assert.Equal(t, "John", user.Name)
}
```

## Native Fuzzing (Go 1.18+)

```go
func FuzzParseURL(f *testing.F) {
    f.Add("https://example.com")
    f.Add("http://localhost:8080/path")
    f.Add("ftp://files.example.com")

    f.Fuzz(func(t *testing.T, url string) {
        parsed, err := ParseURL(url)
        if err != nil {
            return // Skip invalid URLs
        }

        assert.NotEmpty(t, parsed.Scheme)
        assert.NotEmpty(t, parsed.Host)

        // Roundtrip property
        reconstructed := parsed.String()
        reparsed, err := ParseURL(reconstructed)
        require.NoError(t, err)
        assert.Equal(t, parsed, reparsed)
    })
}

// Run: go test -fuzz=FuzzParseURL -fuzztime=30s
```

## Benchmark Testing

```go
func BenchmarkParseURL(b *testing.B) {
    urls := []string{
        "https://example.com",
        "http://localhost:8080/path",
        "ftp://files.example.com/file.txt",
    }

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        url := urls[i%len(urls)]
        _, err := ParseURL(url)
        if err != nil {
            b.Fatal(err)
        }
    }
}

// Run: go test -bench=. -benchmem
```

## Key Commands

```bash
go test ./...                          # Run all tests
go test -race ./...                    # With race detector
go test -coverprofile=coverage.out ./...  # Coverage
go tool cover -html=coverage.out       # Open coverage in browser
go test -fuzz=FuzzFuncName -fuzztime=30s  # Fuzzing
go test -bench=. -benchmem             # Benchmarks
```
