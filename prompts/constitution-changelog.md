## [0.0.1] - 2026-10-22 12:42(UTC-05:00)

**Changed:** Principle 1 (Stack Simplicity) now declares the serverless-native stack: Node.js + TypeScript + Express deployed on AWS Lambda behind API Gateway, with Amazon Aurora DSQL (PostgreSQL-compatible distributed SQL) replacing standalone PostgreSQL as the persistence layer. Principle 3 (Separation of Concerns) now explicitly forbids Lambda imports in business logic, and Principle 5 (Data Persistence) now requires migrations to be Aurora DSQL-compatible. Principles 2, 4, and 6 are unchanged. Rationale: align the constitution with the serverless evolution of the stack while keeping every rule verifiable in code review and the document within the 15-line limit.

## [0.0.1] - 2026-10-21 16:42(UTC-05:00)

Act as a Staff Software Engineer and Principal Architect for a hyper-local web application: a business directory for Alameda del Río (Barranquilla, Colombia). 

We are adopting Spec-Driven Development (SDD) for this project. Before writing any technical specification or source code, we must establish our project's foundational guidelines by creating a `constitution.md` file.

### Context & Technical Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Methodology: Spec-Driven Development (SDD)

### Objective
Draft a concise, authoritative `docs/constitution.md` containing exactly 6 non-negotiable, verifiable principles. 

### Principles Requirements
Each principle must be direct, short, and testable against code reviews, covering:
1. Stack Simplicity: Strict adherence to the core stack without unnecessary abstractions or bloated frameworks/ORMs.
2. Spec-Code Alignment: Absolute requirement that specs precede code; no code enters the codebase without a supporting spec.
3. Separation of Concerns: Strict decoupling of business logic from React UI components and Express HTTP handlers.
4. Testing Standard: Clear policy mandating automated test coverage for core business rules and API endpoints before merging.
5. Data Persistence: Clear rule for PostgreSQL schema definitions using explicit SQL migrations (favoring raw SQL or lightweight query builders over heavy ORMs).
6. Language Standard: Strict mandate that all code, comments, identifiers, commit messages, and API/user-facing text must be written exclusively in English.

### Formatting & Constraints
- Maximum 15 lines total for the entire document.
- Use clear Markdown heading and numbered list format.
- Language of the `constitution.md` document must be English.
- Focus on practical enforcement rather than general advice.