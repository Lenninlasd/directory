# Project Constitution: Alameda Directory

Non-negotiable principles. A pull request that violates any of them is rejected.

1. **Stack Simplicity:** The stack is serverless-native and fixed: React + TypeScript (frontend), Node.js + TypeScript + Express on AWS Lambda behind API Gateway (backend), and Amazon Aurora DSQL (PostgreSQL-compatible distributed SQL) for persistence. Any new dependency, framework, or ORM requires an approved spec that justifies it.
2. **Spec-Code Alignment:** A reviewed spec must exist before any code is written. Every PR links to its spec, and code without a supporting spec is rejected.
3. **Separation of Concerns:** Business logic lives in framework-agnostic modules with no Lambda, Express, or React imports. React components only render UI, and Lambda/Express handlers only parse input, call services, and return responses.
4. **Testing Standard:** Core business rules and every API endpoint must have automated tests that pass in CI before merge. A PR without them is not mergeable.
5. **Data Persistence:** Every schema change is an explicit, versioned, Aurora DSQL-compatible SQL migration committed to the repo. Use raw SQL or a lightweight query builder, and never use heavy ORMs or manual schema edits.
6. **Language Standard:** All code, comments, identifiers, commit messages, and API/user-facing text must be written exclusively in English.