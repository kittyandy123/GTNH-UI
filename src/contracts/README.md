# Export contract

This directory contains the schema-v2 JSON Schema consumed by the GTNH Planner UI.

The authoritative contract is maintained in the
[GTNH Calculator Utility exporter repository](https://github.com/kittyandy123/GTNH).

Current synchronized exporter baseline:

- Exporter commit: `6013399`
- Schema: `schema/recipes-v2.schema.json`
- Representative fixture: `src/test/resources/fixtures/schema-v2-representative.json`

The schema and representative fixture must be updated together whenever the exporter contract changes. The copied fixture is stored in `src/test/fixtures/schema-v2-representative.json`.