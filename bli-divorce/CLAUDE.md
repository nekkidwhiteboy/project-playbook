# CLAUDE.md — BLI Uncontested Divorce Software Platform

## Playbook System
This project is part of the Project Playbook system. 
Read c/projects/project-playbook/CLAUDE.md for the 
master process this project follows.

This file provides Claude Code with full project context for the BLI uncontested divorce SaaS platform. Read this at the start of every session.

---

## Who I Am

I'm Hugh, an attorney with 20 years of family law experience. I built a law firm into a regional powerhouse across six states, with a heavy focus on family law litigation and uncontested divorces. I left the firm in early 2025 and retained rights to the software I developed there. I now want to build a new, modern version of that software as a standalone B2B SaaS business operated through my company, **BLI**.

---

## The Business

### What It Is
A cloud-based B2B SaaS platform that enables attorneys to deliver uncontested divorce services efficiently and at scale. Attorneys lease the software on a **per-transaction fee** basis (no exclusivity limits, no monthly seat fees). Clients experience the platform as a high-touch, guided divorce service — they interact primarily with software, not the attorney directly.

### Core Differentiator
This is the **only B2B platform specifically designed for attorney-delivered uncontested divorces**. Existing solutions are either:
- Consumer-facing (DIY kits) — no attorney oversight
- Generic legal templates — not jurisdiction-specific
- Full litigation software — overkill for uncontested cases

Our platform provides jurisdiction-specific documents, sophisticated property division and parenting plan tooling, and full practice management for the uncontested workflow.

### Revenue Model
- Flat **per-case transaction fee** charged to attorneys each time they process a client divorce through the platform
- No attorney exclusivity — multiple attorneys per jurisdiction are fine
- Additional revenue potential: white-labeled marketing content, education programs, chatbots, and video content licensed to attorneys under contract

### Target Customers (B2B)
- Solo practitioners
- Small family law firms
- Existing uncontested divorce practices
- Attorneys who want to add an efficient, high-volume uncontested service line

### End Users (B2C, served via attorneys)
- Couples who have agreed on all divorce terms and want to stay out of court
- They want speed, affordability, and attorney assurance — not DIY risk

---

## Launch Strategy

### Phase 1 — Internal Beta
Deploy first at a friend's law firm to work out bugs and hone the process. Arrange a fee-sharing agreement during this period.

### Phase 2 — Initial Markets
Launch in **Kentucky** and **Indiana** — Hugh has deep knowledge of legal processes in both states.

### Phase 3 — Expansion
Expand to **Washington** and **Colorado** — Hugh has established contacts there to facilitate market entry.

---

## The Previous Software (Reference / Starting Point)

Hugh built and owns the code from a prior system. Key characteristics:
- **Stack:** Python/React backend; pulled data from a database to fill document sets
- **Client flow:**
  1. Client signs retainer + pays flat fee ($497 + filing fee)
  2. Client provides brief info for conflict check
  3. After conflict check clears, client receives intake form link
  4. Client completes extensive intake (demographics, property, children)
  5. Data saved to database; paralegal notified
  6. Paralegal selects client + jurisdiction in software
  7. Software auto-fills jurisdiction-specific document set, saves drafts + PDFs to client folder
  8. Zoho Desk notified; paralegal sends documents + automated emails
  9. Client reviews, makes one round of changes, optionally requests attorney consult (rare)
  10. Client approves; paralegal arranges signing (in-person or remote)
  11. Paralegal scans and files manually with the court

- **Integrations used:** Zoho Desk (help desk + automation)
- **Known issues:** Modified intake form based on an older program with some bugs; heavy reliance on Zoho Desk modifications

Hugh wants to **rebuild from scratch with current technology** rather than port the old code. The goal is a self-contained platform that doesn't rely on third-party help desk integrations.

---

## MVP Feature Set

The MVP must cover the full uncontested divorce workflow end-to-end:

| Feature | Notes |
|---|---|
| Client intake | Replaces old form; must handle demographics, property, children |
| Conflict check workflow | Brief info collected upfront; attorney clears before intake begins |
| Retainer + flat-fee payment | Integrated payment processing at first contact |
| Jurisdiction-specific document generation | Auto-fill from intake data; supports KY and IN at launch |
| Attorney review portal | Attorney/paralegal reviews generated docs before delivery |
| Document revision round | Client gets one round of changes |
| E-signature capability | Remote signing supported |
| Automated client communications | Onboarding emails, status updates, document delivery — all built-in (no Zoho) |
| AI chatbot assistant | Guides clients through the process, answers common questions |
| Integrated help desk / support portal | Tier 1 automated; Tier 2+ escalates to attorney or staff |
| Progress tracking | Client-facing status view |
| Client-attorney communication channel | In-platform messaging |
| Attorney consultation booking | Optional upsell; rarely used but needed |
| White-label branding | Attorneys can brand the client-facing experience |

---

## Workflow Questions Still Being Clarified

Before full technical architecture is finalized, these open questions need resolution:
- Exact payment processing timing and provider
- Conflict check process details (manual review vs. automated)
- Document customization scope per jurisdiction
- E-filing capability vs. manual filing (varies by jurisdiction)

---

## Key Business Learnings from Previous Firm

1. **Volume + speed = exceptional reviews.** Clients were thrilled by how fast and painless the process was. This generated massive referral volume.
2. **Failed agreements = litigation pipeline.** A substantial share of clients who started the process couldn't reach full agreement. These became hourly litigation clients — a reliable, organic growth channel.
3. **$497 was probably underpriced** for Kentucky. Pricing should be re-evaluated per jurisdiction.
4. **Paralegal-driven workflow works.** Attorneys rarely needed to intervene. The system was designed so paralegals could run nearly the entire process.

---

## Brand Voice (for any marketing or client-facing copy)

- **Direct, real, slightly irreverent** — never stuffy or jargon-heavy
- **Empathetic and stabilizing** — clients are in a hard moment; the brand is a calm, capable ally
- **No legalese.** Treat clients like intelligent adults.
- Formality scale: marketing copy = 4/10, legal specifics = 8/10
- Think: sharp attorney at a dinner party — makes complex things simple, everyone's glad they sat next to them

---

## Target Client Profile (End Users)

- Couples who've agreed on all terms and want to avoid court
- They value: speed, clarity, affordability, assurance, discretion
- They fear: costly mistakes, financial ruin from attorney fees, getting stuck in a confusing system, emotional damage from litigation
- They say things like: *"We just want it over with."* / *"We've agreed on everything."* / *"We want to stay out of court."*

---

## Project Files in This Repo

| File | Contents |
|---|---|
| `audience_knowledge_base_divorce.md` | Detailed audience psychology, fears, language, values |
| `brand_voice_divorce_firm.md` | Brand voice guide, tone, messaging goals, examples |
| `Offer_Knowledge_Base_Uncontested_Divorce_Software.docx` | Full offer overview: B2B + B2C segments, delivery, automation matrix |
| `why_clients_love_us.md` | Client testimonials, emotional before/after, what drives satisfaction |
| `Project_Purpose.docx` | Hugh's original project brief — full background and vision |

---

## Technical Direction

- **New build** — not a port of the old Python/React system
- **Self-contained** — no reliance on Zoho Desk or other external help desk platforms
- **Cloud-based** — no downloads required for attorneys or clients
- **Stack decisions:** TBD (to be planned collaboratively)
- **Security:** Must meet standards appropriate for legal/PII data
- **Architecture:** Full technical architecture is the immediate next milestone

---

## Current Status

- ✅ Business model validated
- ✅ Core competitive advantages defined
- ✅ Go-to-market strategy set (KY → IN → WA → CO)
- ✅ Revenue model finalized (per-case transaction fee)
- ✅ MVP feature set defined
- ⏳ Open workflow questions being resolved
- ⏳ Technical architecture — next major milestone
- ⏳ Beta target: 30–60 days after development begins
