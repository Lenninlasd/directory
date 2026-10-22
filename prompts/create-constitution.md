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

Generate only the contents of `constitution.md`.