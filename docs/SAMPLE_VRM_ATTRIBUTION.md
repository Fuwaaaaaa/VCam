# Sample VRM Attribution

VCam bundles the following VRM 3D models as "sample" assets shipped under
`public/samples/` (web build) and inside the Tauri desktop installers.
These models are **NOT covered by VCam's MIT license** (`/LICENSE`). Each
is licensed separately by its original author. Their licenses are
respected and reproduced below.

If you redistribute VCam (forks, custom builds), you MUST keep this
attribution and obey each model's license terms.

---

## sample.vrm

| Field | Value |
|---|---|
| Filename | `public/samples/sample.vrm` |
| Display name | _(fill in after VRM file is added)_ |
| Author | _(fill in)_ |
| Source URL | _(fill in)_ |
| License | _(fill in — e.g. CC BY 4.0, CC BY-SA 4.0, etc.)_ |
| License URL | _(fill in)_ |
| Allowed: redistribution | _(yes / no)_ |
| Allowed: bundling in closed-source installer | _(yes / no)_ |
| Allowed: commercial use | _(yes / no)_ |
| Required attribution text | _(copy verbatim from license)_ |
| Date acquired | _(YYYY-MM-DD)_ |
| Acquired by | _(GitHub username)_ |

### Required attribution display

_(If the model's license requires attribution to be shown in-app, document
the exact text and where it must appear. e.g. "About dialog must contain
'Avatar by ___ — CC BY 4.0'".)_

---

## Candidate VRMs (researched but not yet bundled)

These were considered but not chosen. Reasoning recorded for future
re-evaluation.

- **AliciaSolid** (ニコニ立体, CC BY) — _status: pending license re-check
  for closed-source Tauri installer redistribution_
- **VRoid Hub OSS-labeled models** — _status: case-by-case_
- **ニコニ立体ちゃん** — _status: pending_

---

## Removal procedure

If a model author later revokes redistribution permission:

1. Delete `public/samples/<filename>.vrm`
2. Remove the entry from this file
3. Cut a new VCam release without the asset
4. Notify users via CHANGELOG and GitHub release notes
