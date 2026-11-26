# Ideas: A Store Run by Prompts and Files

- **Status:** Ideas. This is not a spec and nothing here is approved. Code is written only after an approved OpenSpec change covers it (AGENTS.md).
- **Created:** 2026-11-24
- **Related:** [business-sourcing.md](./business-sourcing.md), [ai-patterns-guide.md](./ai-patterns-guide.md), [interview-question-bank.md](./interview-question-bank.md)

"The idea" is the owner's concept. Everything after it is a proposal to discuss.

## The idea

An online store for local businesses that is **as simple to create and run as an Instagram page**, with as few forms as possible.

In a classic store, the owner adds products one by one, attaches photos, and keeps prices and stock up to date. That is constant work, and many local businesses have nobody to do it. With today's AI, that way of working is outdated.

- **Create:** the owner uploads a PDF with the products, a photo, or a set of photos, and the inventory is generated.
- **Run:** the owner writes what they want, for example "sube los brownies a 8.000", and it changes.
- **Sell in drops:** the owner launches a campaign with limited stock. A home business that sells desserts on weekends writes "este sábado 20 cheesecakes a 45 mil, pedidos hasta el viernes a las 6".

## Why it could work here

- The problem is maintenance, not publishing. A store that goes stale is worse than none.
- The directory already gives local customers a place to find the business. A standalone store starts with no visitors.
- The pattern is already built and measured once: opening hours editing (Spanish request → proposal → validation in code → human confirmation). Its eval scored 24 of 25 cases for less than one US cent.

**The weak point:** reading a menu with AI is easy to copy. The part that is harder to copy is the weekly drop, tied to a neighborhood and to WhatsApp. No market research has been done yet.

## Principles

1. **Fewer forms, not zero interface.** Text is best to express an intention. A tap is best to confirm it and for what repeats ("Agotado").
2. **The AI proposes, code validates, the owner confirms.** Nothing is published without a visible before and after.
3. **Everything can be undone,** except what customers already ordered.
4. **The model never decides money or stock.** Prices are checked by code and stock is reserved in one SQL transaction.
5. **Unknown is empty.** A price, ingredient, or allergen that is not written is left blank and asked for, never invented.
6. **Only the owner's own photos.** No generated food images: they would show something nobody sells.
7. **The business id comes from the session,** never from the prompt or a file.

## The objects

| Object | What it is |
|---|---|
| **Product** | Name, variant, price, optional photo and description |
| **Drop** ("tanda") | Some products for a date, with stock, an order deadline, and a pickup or delivery moment |
| **Reservation** | A customer's units, held for a limited time until the owner confirms the payment |
| **Proposal** | The operations the AI suggests (`create_drop`, `set_price`, `set_stock`, `close_drop`), with the before and after computed by code |
| **Change record** | Who confirmed what and when. It makes undo possible |

A proposal is a list of **operations**, unlike opening hours, where the model returns the whole week (design D-2 of that change). A week has seven days. Rewriting a whole catalog costs more, and could silently change a price nobody mentioned.

## Two AI systems, not one

```
IMPORT (workflow: code knows the steps)
file ─► [AI] extract ─► [code] validate, match duplicates ─► owner reviews ─► products

RUN (small agent: the request is open)
prompt ─► [AI] choose operations ─► [code] validate, compute the diff ─► owner confirms ─► transaction
```

| Technique | Import | Run |
|---|---|---|
| Structured output and domain validation | Yes | Yes |
| Vision and documents | Yes | No |
| Tool calling (tools that only read or propose) | No | Yes |
| Asynchronous jobs | Yes | No |
| Evals, cost limits, logs without personal data | Yes | Yes |
| Prompt injection defenses | The extractor has no tools | Permissions are enforced in code |

Not needed at this size: RAG, fine-tuning, several agents, long-term memory.

## What has to change in the project

| Today | Needed |
|---|---|
| One admin key shared by the team | Each owner acts only on their business (step 6) |
| The detail is a dialog, with no URL | A link per drop, to share on WhatsApp and Instagram |
| Photos and managing businesses are excluded by the directory spec | Deltas that remove those rows from "Deliberate exclusions" |
| The Lambda stops at 10 seconds | Enough for one text interpretation (6.3 s cold and 2.3 to 2.6 s warm, measured for opening hours). A PDF needs an asynchronous job |
| No file storage | Uploads that do not pass through the Lambda. The service needs approval |
| WhatsApp closes the sale | The order is recorded **before** opening the chat. Otherwise stock is always wrong |

## Steps

Each step has an exit test. If it fails, stop or rethink before paying for the next one. Steps 1 and 2 can run at the same time.

### 0. Finish the directory

Archive `import-businesses` (complete, not archived yet) and do the two tasks of `finish-mvp-rollout`.

- **Exit test:** `prod` is online with real businesses. Without visitors there is nobody to buy.

### 1. Prove the need by hand (no code, two weeks)

Find 3 home businesses that sell on weekends. They send their drop by WhatsApp in their own words, the administrator publishes it by hand (a simple image or message) and tracks the orders in a spreadsheet.

Save, with permission: the messages exactly as written, how long each update takes, what changes after publishing, and how many orders arrive.

- **Exit test:** at least 2 of the 3 send a second drop without being reminded. If they do not send it even by WhatsApp, AI will not fix it.
- **Bonus:** the messages are the first golden set, in real language.

### 2. Prove the reading (local, `catalog-lab`)

The extractor and its scorer exist in the separate `catalog-lab` project, with no model called yet. Fix the four gaps its spec lists as blocking (G-1 to G-4), confirm the price rules and the goals, label 5 real menus, then 20, and run the three models.

- **Exit test:** one model meets the goals (price ≥ 99%, no guessed prices), **and** correcting its answer is clearly faster than typing the menu.
- It decides step 7 only. Steps 3 to 6 do not read files.

### 3. First slice: a drop from a message (`add-drops`)

The administrator pastes the owner's message, the AI proposes a drop, the administrator confirms it, and the directory shows it with its own link. It reuses the admin key and the opening hours pattern, so it needs no accounts, photos, or files.

- Includes: migrations for products and drops, the interpretation endpoint, its eval with the messages of step 1, the public drop page.
- **Exit test:** publishing a drop from a message takes under 2 minutes, with no wrong price published in 4 weekends.

### 4. Reservations (`add-drop-reservations`)

The customer chooses a quantity and the units are held before WhatsApp opens. The hold expires. The administrator confirms the payment (Nequi or transfer, outside the system) or releases the units.

- Includes: the stock transaction, expiry, idempotency, and a test with simultaneous reservations of the last unit.
- Collects personal data (a name and a number), so it needs the data policy of [business-sourcing.md](./business-sourcing.md) first.
- **Exit test:** no drop sells more units than it has, and owners stop keeping their own list.

### 5. Change by prompt (`edit-drops-with-prompts`)

"Quedan 5", "sube el cheesecake a 48", "cierra los pedidos". The model chooses operations, code shows the before and after, a person confirms, and the change can be undone. Taps cover what repeats.

- Includes: tool calling with a step limit, change records, and an eval that counts wrong operations separately from misunderstood ones.
- **Exit test:** 95% of real requests need no second attempt, and no change touches a product nobody mentioned.

### 6. Owners on their own (`add-owner-access`)

A one-time code sent to the published number, no passwords, as [business-sourcing.md](./business-sourcing.md) already suggests. Start when updating for them takes more time than the administrator has.

- Includes: permissions per business, limits per business on calls and cost, and tests that one business cannot change another.
- **Exit test:** 3 owners run a full weekend without help.

### 7. Photos and files (`import-catalog-from-files`)

PDF, photos, or a set of photos become products to review, through an asynchronous job. Needs step 2.

- Later, as separate changes: matching a set of photos to products, and more than one file at a time.
- **Exit test:** a new owner publishes a first catalog in under 10 minutes from a phone.

### 8. WhatsApp and payments

The owner runs the store from WhatsApp, and customers pay online. Each needs its own study first (Meta verification and price per message, payment provider, taxes, refunds).

- **Exit test:** decided with the numbers of step 6, not before.

## How to know it worked

| Measure | Goal |
|---|---|
| First drop published by a new owner | Under 5 minutes, on a phone |
| Changes made without a form | 90% |
| Wrong prices published | 0 |
| Units sold over the stock | 0 |
| Owners who publish again the next week | 60% |
| AI cost per business per month | Set after step 3, with real tokens |

The goals are a starting proposal, not measured values.

## Risks

| Risk | Defense |
|---|---|
| A wrong price is published, and the announced price may bind the seller (Law 1480 of 2011, to be confirmed with a lawyer) | Confirmation with the source text next to the number, a warning on large changes, undo |
| An allergen is invented or lost | Copy only what is written, and ask the owner |
| Instructions hidden in a file | The extractor has no tools and its output is only data |
| One business changes another | Authorization in code, tested |
| Food sold from home may have health and tax obligations | Ask before step 3. The directory must not promise they are met |
| Cost of a public AI endpoint | Only authorized users, limits per business, a daily cap |
| Too much is built before anyone uses it | The exit tests |

## Open questions

1. Is the main goal a product with real users, or a project to show in interviews? It changes the order: a product starts at step 1, a portfolio can start at step 2.
2. Is the store part of the directory or a separate product that the directory links to?
3. Who answers for an order that is not delivered?
4. Who pays, and when: free at the start, a monthly fee, or a fee per order?
5. Does a drop need its own page, or is a section of the business enough?
