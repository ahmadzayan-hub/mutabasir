# EvidenceObject — Portfolio Evidence Contract (v0.1)

One shared evidence language for the whole portfolio. The same fact —
*"Contract requires submission within 14 days."* — may appear in a
Mutabasir executive brief, a VERTEX compliance finding, an ExecFlow
decision and a Pitchora board slide, but it always carries **one
`evidence_id`**, so every system can answer **"Show me the source."**

Schema: [`evidence-object.schema.json`](./evidence-object.schema.json)

## Rules

1. **Producers**: Mutabasir is the primary producer (extraction).
   VERTEX may produce evidence for clause segmentation it performs
   itself. No other product mints evidence — they reference it.
2. **Consumers** (VERTEX, ExecFlow, Pitchora, Annual Plan) store the
   `evidence_id` + display fields, never a mutated copy of the fact.
3. **Integration is contracts, not tables** — evidence travels over
   product APIs / domain events. No product reads another product's
   database.
4. **`classification` drives routing**: a `confidential`/`restricted`
   object must never leave approved boundaries — the AI Gateway uses
   this field to forbid cloud egress and select a local model.
5. **Versioning**: any change to the source document produces new
   evidence objects against the new `source_version`; existing ids are
   immutable.
6. **Canonical home**: lives here (Mutabasir owns extracted facts)
   until a shared `platform-contracts` repository exists; consuming
   products vendor the schema by version tag, not by copy-paste edits.
