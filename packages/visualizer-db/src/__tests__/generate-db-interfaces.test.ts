import { describe, expect, it } from 'vitest';
import { resolveColumnType, toCamelCase, toPascalCase } from '../../scripts/generate-db-interfaces';

describe('generate-db-interfaces', () => {
  it('converts identifiers to camelCase and PascalCase', () => {
    expect(toCamelCase('generated_asset')).toBe('generatedAsset');
    expect(toCamelCase('created_at')).toBe('createdAt');
    expect(toPascalCase('generated_asset')).toBe('GeneratedAsset');
  });

  it('resolves enums, arrays, and nullability', () => {
    const enumTypeNames = new Map([['asset_status', 'AssetStatus']]);

    expect(resolveColumnType({ dataType: 'USER-DEFINED', udtName: 'asset_status', isNullable: false }, enumTypeNames)).toBe('AssetStatus');

    expect(resolveColumnType({ dataType: 'ARRAY', udtName: '_asset_status', isNullable: true }, enumTypeNames)).toBe(
      'AssetStatus[] | null'
    );

    expect(resolveColumnType({ dataType: 'ARRAY', udtName: '_uuid', isNullable: false }, enumTypeNames)).toBe('string[]');

    expect(resolveColumnType({ dataType: 'numeric', udtName: 'numeric', isNullable: false }, enumTypeNames)).toBe('number');
  });
});
