# Product Authority — Mutabasir · متبصّر

## Primary User

Someone who has been handed a stack of documents and has to say something
defensible about them — to a director, a committee, or a client — soon.

## Job To Be Done

Turn documents into claims a reader can check, where **every claim opens
the exact place in the source it came from**.

## System of Record

Projects, uploaded documents and their parsed text, extracted claims, and
the EvidenceObject minted for each claim.

## System of Intelligence

Extraction of structured claims from unstructured documents, and the
anchoring of each claim to the text that actually supports it.

## Primary Workflow

```
upload → parse → extract claims → anchor each claim to real source text
      → reconcile the claim against what it cites
      → read side by side, source highlighted
      → brief
```

## Human Decision Boundary

This is the whole product, so it is stated precisely.

- **A citation must be text the reader can see.** Both extraction paths
  produce quotes that are close to, but not literally in, the source: the
  deterministic baseline composes a representative sentence, and a model
  paraphrases. Every claim is re-anchored onto the best matching real line
  of the parsed document. When nothing matches well enough, the UI says
  the span could not be located rather than highlighting something
  arbitrary.
- **A claim may not contradict its own citation.** After anchoring, each
  numeric value in a claim is checked against the numbers in the text it
  points at. Where they disagree the claim is marked unsupported and its
  confidence drops. This is derived at read time and never stored: it
  describes a *pairing* of claim and citation, so it must be recomputed
  whenever either changes.
- **The baseline does not invent figures.** It reads values out of the
  document, or emits no fact. A missing fact is honest; a fabricated one
  is not.
- A model may propose a claim. It never gets the last word on whether the
  evidence supports it.

## Measurable Outcome

**North star:** claims that survive being checked.

Supporting: share of claims anchored to real source text, share flagged
as contradicting their citation, time from upload to a defensible brief.

## Explicit Non-Goals

- Not a presentation tool → **Pitchora**, which references evidence by id
- Not a contract-compliance product → **VERTEX**
- Not a commerce system → **Masaar**
- Not a learning platform → **Maktab**
- Not a general search engine, and not a chatbot over documents

## External Systems

- **Supabase** — optional. The demo path runs end to end without it.
- **WebLLM** — on-device model. Nothing is sent anywhere for the local
  path to work.
- Evidence is published as **EvidenceObject** (`ev_<ulid>`, `sha256:`
  source hashing, character-span locators) for other products to
  reference by id.

## Data Ownership

Mutabasir owns documents, parsed text, claims and evidence objects. Other
products **reference evidence by id and never copy or edit it** — an
evidence object that can be edited downstream is not evidence.

## Canonical Repository

`github.com/ahmadzayan-hub/mutabasir` · branch `main`

## Production Deployment

Vercel project `mutabasir`.

## Known limitations

- The deterministic baseline extracts a fixed set of fact types. It is a
  floor that works without credentials, not a general extractor.
- Anchoring is lexical, not semantic. A claim genuinely supported by a
  passage that shares few words with it will report "not located" rather
  than guess — the correct failure, but a failure.
