# Vercel CLI Environment Variables

## CRITICAL: Heredoc adds newlines

```bash
# ❌ BREAKS API KEYS - adds \n
vercel env add KEY production <<< "value"

# ✅ CORRECT
vercel env add KEY production <<EOF
value
EOF
```

## Commands
```bash
vercel env ls production                    # list vars
vercel env pull --environment production    # check values
vercel env rm KEY production -y             # remove
vercel --prod                              # deploy
```

## Common Error
"Connection to [Service]" = check for \n in keys