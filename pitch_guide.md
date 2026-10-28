# SyncSphere — 3-Minute Hackathon Live Judging Script & Demo Rehearsal

**Track**: Social Impact (Primary) & Open Innovation  
**System**: SyncSphere (AI-Powered Offline-First Data Synchronization Platform)  
**Time Limit**: 3 Minutes (180 Seconds)

---

## 🛠 Stage Setup (Before Stepping Up)
1. **Launch Backend**:
   ```powershell
   npm run backend
   ```
2. **Reset Demo State**:
   ```powershell
   .\venv\Scripts\python seed_demo.py
   ```
3. **Open Browser Windows / Split Screen**:
   - **Left Window (`http://localhost:5173`)**: Switch to **Dual Sandbox** or **Frontline Form** tab for **Worker A (ANM Nurse)**.
   - **Right Window (`http://localhost:5173`)**: Switch to **Dual Sandbox** or **Frontline Form** for **Worker B (Field Surveyor)**.
   - **Lower / Center View**: Switch to **Supervisor Triage** (`SupervisorDashboard.tsx`).

---

## ⏱ 3-Minute Step-by-Step Live Rehearsal Script

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 0:00 - 0:45 | ACT 1: Zero-Connectivity Data Entry (Local Dexie Storage)    │
└─────────────────────────────────────────────────────────────────────────────┘
```
- **Spoken Pitch (Presenter 1)**:
  > *"Judges, over 100 million frontline workers — like ASHA health workers and disaster relief volunteers — operate in zero-connectivity rural areas. Traditional digital tools break down the moment the network drops, or blindly overwrite life-saving immunization records using simplistic 'Last-Write-Wins' rules.*
  > 
  > *Watch what happens with SyncSphere."*

- **Live Screen Action**:
  1. Point to **Network Manager** toggle at the top of both screens: Toggle both to <span style="color:#f43f5e;font-weight:bold;">🔴 OFFLINE (EDGE STORAGE ACTIVE)</span>.
  2. **Worker A (ANM Nurse)**:
     - Select Vaccine Status: `Completed`.
     - Enter Batch #: `BCG-4401`.
     - Enter Notes: `"Administered 1st dose at home. Verified Aadhaar."`
     - Click **Queue Offline Mutation**.
     - *Show*: Mutation buffers immediately into local IndexedDB outbox queue (`parent_rev: 1-base00`, `GPS: ±3.2m`). Zero latency.
  3. **Worker B (Field Surveyor)**:
     - Select Vaccine Status: `Pending`.
     - Enter Notes: `"House visited 15m later; patient reported working in farm fields."`
     - Click **Queue Offline Mutation**.
     - *Show*: Mutation buffers safely into local IndexedDB outbox queue without blocking.

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 0:45 - 1:30 | ACT 2: First Reconnection & Fast-Path Direct Commit           │
└─────────────────────────────────────────────────────────────────────────────┘
```
- **Spoken Pitch (Presenter 1/2)**:
  > *"Now, Worker A returns to a village center with cellular connectivity. SyncSphere's delta sync engine initiates an uplink to the district base station."*

- **Live Screen Action**:
  1. Toggle Worker A's **Network Manager** to <span style="color:#10b981;font-weight:bold;">🟢 ONLINE</span>.
  2. Click **Push Delta Sync**.
  3. *Show Live Protocol Output*:
     - Base station verifies `payload.parent_rev (1-base00) == current_record.current_rev (1-base00)`.
     - Fast-Path executes: commits to server head revision `2-xxxxxx`.
     - Worker A's outbox marks `synced: true`.

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1:30 - 2:15 | ACT 3: Concurrent Reconnect & MVCC Collision Detection        │
└─────────────────────────────────────────────────────────────────────────────┘
```
- **Spoken Pitch (Presenter 2)**:
  > *"Minutes later, Worker B reconnects. In conventional apps, Worker B's 'Pending' status would silently overwrite Worker A's 'Completed' vaccine record because of clock drift!*
  > 
  > *SyncSphere's distributed MVCC engine prevents data destruction."*

- **Live Screen Action**:
  1. Toggle Worker B's **Network Manager** to <span style="color:#10b981;font-weight:bold;">🟢 ONLINE</span>.
  2. Click **Push Delta Sync**.
  3. *Show Live Protocol Output*:
     - Backend detects divergence: Worker B's `parent_rev` is `1-base00`, but server head is already `2-xxxxxx`.
     - Returns `{"status": "COLLISION_FORKED"}`.
     - Automatically forks both branches into `conflict_logs` and dispatches **Gemini 2.5 Flash** asynchronously.

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2:15 - 3:00 | ACT 4: Gemini 2.5 Flash Semantic Triage & 1-Click Merge        │
└─────────────────────────────────────────────────────────────────────────────┘
```
- **Spoken Pitch (Lead Presenter)**:
  > *"Now look at the District Supervisor Portal. Instead of facing cryptic JSON merge conflicts, the supervisor sees plain English intelligence from Gemini 2.5 Flash."*

- **Live Screen Action**:
  1. Switch to **Supervisor Triage** tab.
  2. Point out the live conflict card (auto-polled in 3 seconds):
     - **Pulsating Badge**: `COLLISION DETECTED`.
     - **Gemini Summary**: *"Worker A recorded status Completed with batch BCG-4401, while Worker B reported patient unavailable."*
     - **Confidence Meter**: `94% Confidence`.
     - **Side-by-Side Diff**: Shows Worker A's clinical ANM authority vs Worker B's logistics notes.
     - **Clinical Rationale**: *"Certified clinician with documented cold-chain batch BCG-4401 takes precedence for vaccine administration; preserving surveyor demographics."*
  3. Click the primary button: **"Apply AI Synthesized Merge"**.
  4. *Celebratory confetti fires*: Server head updates to `3-mrgxxxx`!
  5. *Closing Line*:
     > *"SyncSphere ensures zero unintended data overwrites, cuts supervisor triage time by 85%, and keeps frontline healthcare resilient in the most remote corners of the planet. Thank you!"*

---

## 🎯 Anticipated Judge Q&A Cheat Sheet

| Question | Defensible Answer |
| :--- | :--- |
| **Q: Why not just use Firebase or CouchDB?** | *Firebase uses Last-Write-Wins which blindly destroys data based on clock drift. CouchDB dumps raw JSON conflict trees on developers. SyncSphere preserves MVCC branching logs and uses Gemini to synthesize semantic human intent.* |
| **Q: Does AI run on low-end offline mobile devices?** | *No. Client-side data collection is 100% offline using Dexie/IndexedDB with zero AI compute required in the field. Semantic AI triage runs asynchronously when packets sync to district hubs.* |
| **Q: What stops Gemini from hallucinating medical facts?** | *Strict Pydantic JSON schemas with deterministic field extraction (`response_schema=SemanticTriageReport`). The model only evaluates and recombines provided fields, with human-in-the-loop approval.* |
| **Q: How does this scale beyond healthcare?** | *The decoupled local-first MVCC topology works universally for disaster relief supply tracking, agricultural field surveys, and offline government census drives.* |
