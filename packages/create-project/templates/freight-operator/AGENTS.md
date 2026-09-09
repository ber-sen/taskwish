# TaskWish project instructions

This project uses TaskWish. Before planning or modifying code, read and follow
`.agents/skills/taskwish/SKILL.md` for the framework's architecture, APIs, and
conventions.

Keep PowerBroker writes behind the FreightOperator approval action. Extraction
must never approve or submit a load. Revisions invalidate prior review. Do not
retry an ambiguous order submission automatically; reconcile it with McLeod.
