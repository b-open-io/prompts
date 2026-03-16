# Plugin UI Reference

## Hooks

Import from `@paperclipai/plugin-sdk/ui`:

### usePluginData
```ts
const { data, loading, error, refresh } = usePluginData<T>(key, params?)
```
Calls worker-side `ctx.data.register(key, handler)`. Re-fetches when `params` reference changes. Memoize params with `useMemo`.

### usePluginAction
```ts
const doAction = usePluginAction(key)
const result = await doAction({ param: "value" })
```
Calls worker-side `ctx.actions.register(key, handler)`. Throws `PluginBridgeError` on failure.

### useHostContext
```ts
const { companyId, companyPrefix, entityId, entityType, projectId, userId } = useHostContext()
```
Host-injected, no worker round-trip. `companyPrefix` for building internal URLs.

### usePluginStream
```ts
const { events, lastEvent, connected, connecting, error, close } = usePluginStream<T>(channel, { companyId })
```
SSE connection to `ctx.streams.emit(channel, event)`. Events accumulate in array. Use `lastEvent` for current state.

### usePluginToast
```ts
const toast = usePluginToast()
toast({ title: "Done", body: "Details", tone: "success", ttlMs: 5000, action: { label: "View", href: "/path" } })
```

## Component Props

- `PluginWidgetProps` — dashboard widgets
- `PluginPageProps` — full pages
- `PluginTabProps` — detail tabs
- `PluginSidebarProps` — sidebar entries

All receive context via `useHostContext()`.

## Patterns

### Data loading
```tsx
const { data, loading, error } = usePluginData<T>("key", { companyId });
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;
// render data
```

### Refresh after action
```tsx
const overview = usePluginData<T>("overview", { companyId });
const doAction = usePluginAction("resync");

const handleResync = async () => {
  await doAction({ companyId });
  overview.refresh();
};
```

### SPA navigation
```tsx
const handleNavigate = (href: string) => {
  window.history.pushState({}, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
```

### Dark mode detection
```tsx
const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));
useEffect(() => {
  const observer = new MutationObserver(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}, []);
```

### Streaming UI
```tsx
const { events, connected } = usePluginStream<{ step: number; message: string }>("progress", { companyId });
return (
  <div>
    {events.map((e, i) => <div key={i}>{e.message}</div>)}
    {connected && <span>Running...</span>}
  </div>
);
```

## Styling

Plugin UIs share the host's CSS variables but not Tailwind JIT output. Use:
- Inline `style` objects with CSS variables: `var(--foreground)`, `var(--background)`, `var(--border)`, `var(--muted-foreground)`, `var(--card)`, `var(--accent)`, `var(--primary)`, `var(--destructive)`, `var(--input)`
- Standard Tailwind utility classes (present in host stylesheet) also work

## Error Isolation

The host wraps every plugin slot mount in an error boundary. Plugin crashes render a fallback without affecting the host. No need for top-level error boundaries in plugin components.
