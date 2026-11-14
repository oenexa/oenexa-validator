# OENEXA Validator Service (`oenexa-validator`)

> **Sovereign Layer 1 Proof-of-Stake Validator Node, Consensus Telemetry & Slashing Monitor**  
> Governed by the OENEXA Blockchain Architecture & Network Security Organizations.

## 1. Domain Ownership
This repository authoritatively owns the **Validator & Consensus Operations Domain**:
- **Owned Data**: Validator Registries, Ed25519 Consensus Keys, Bonded Stakes, Uptime Heartbeats, Slashing Proofs.
- **Owned APIs**: `POST /v1/validator/heartbeat`, `POST /v1/validator/slash`, `GET /v1/validator/status`.
- **Database Boundary**: Isolated `oenexa-validator-prod-db`. Zero shared databases.
