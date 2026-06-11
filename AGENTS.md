## MacTech Suite — Pre-Tenant Speed Mode

**Binding:** DR-2026-06-10-01 + DR-2026-06-10-02

### This repo

- **Canonical appKey:** `bizops`
- **Branch:** `agent/bizops-v1`
- **Protected routes:** Clerk session → Hub authority snapshot → domain logic

### Identity

- No local identity SoT. Domain stubs reference Hub IDs only.

### You may not

- Commit secrets; use `railway variables set`
- Deploy production domains without Brian
- Import OpsCore identity patterns

### References

- Control repo: `docs/HUB_AUTH_CONTRACT_V1_SPEC.md`
- Control repo: `docs/BIZOPS_APP_SPEC.md`
