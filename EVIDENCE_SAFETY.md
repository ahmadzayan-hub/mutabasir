# Evidence safety repair

Based on main 95e6d16d241f9648e2ccfe1253b833f738c7e886 after merged PR #6.

Template assets remain available but are LOW, explicitly marked TEMPLATE / NOT EVIDENCE, and cannot enter the reviewed publication path. All generated illustrative briefs carry bilingual demo warnings in their text (including copy/export). The reviewed composer emits only cited claim payloads, not the demo's ungrounded operational recommendations.

Citation integrity is not semantic verification. Publication requires an available exact citation, numeric consistency, and explicit human confirmation of meaning/values bound to the unchanged claim and citation. Missing sources, a stale review, legacy briefs or edited brief text fail closed. A successful local review is not authenticated organizational approval. These controls are client-side safeguards, not a security boundary against someone editing localStorage.

Source text is deliberately not persisted by the existing application. After reload, re-extract and review; cached flags alone cannot authorize another publication. Existing downloadable/printed snapshots remain accessible with a permanent local-demo warning. They are not operationally accepted evidence.

No cloud persistence, identity migration, live DB writes, external provider calls, production deployment or merge was performed. Durable authenticated review, cloud persistence/restore and real-browser acceptance remain release blockers. Any such migration requires verified existing infrastructure, reviewed migration/backup/rollback and owner approval.

Rollback: reject this draft PR, or revert its commit before release. No data migration is included. Existing localStorage data is preserved.

Reproduce: npm ci --ignore-scripts; npm test; npm run typecheck; npm run lint. Synthetic tests do not download a model or call a provider.
