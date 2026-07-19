import Ajv2020 from 'ajv/dist/2020'
import type { ErrorObject } from 'ajv'
import recipesV2Schema from '../contracts/recipes-v2.schema.json'
import type { ExportDocument } from '../types/recipe'

const SCHEMA_VERSION_V2 = 2

const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
})

const validateSchemaVersionTwo =
    ajv.compile<ExportDocument>(recipesV2Schema)

export function validateExportDocument(value: unknown): ExportDocument {
    if (!isRecord(value)) {
        throw new Error('Recipe export must be a JSON object')
    }

    if (value.schemaVersion !== SCHEMA_VERSION_V2) {
        throw new Error(
            `Unsupported recipe export schema version: ${formatSchemaVersion(value.schemaVersion)}. ` +
            `Supported version: ${SCHEMA_VERSION_V2}.`,
        )
    }

    if (!validateSchemaVersionTwo(value)) {
        throw new Error(
            `Recipe export failed schema-v2 validation: ${formatValidationErrors(
                validateSchemaVersionTwo.errors,
            )}`,
        )
    }

    return value
}

function formatSchemaVersion(value: unknown): string {
    if (typeof value === 'number' || typeof value === 'string') {
        return String(value)
    }

    return 'missing'
}

function formatValidationErrors(errors: ErrorObject[] | null | undefined): string {
    if (!errors || errors.length === 0) {
        return 'unknown validation error'
    }

    return errors
        .map((error) => {
            const path = error.instancePath || '/'
            return `${path} ${error.message ?? 'is invalid'}`
        })
        .join('; ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}