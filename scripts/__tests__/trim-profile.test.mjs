// T-44-01: Real assertions for shared trim() (Plan 44-01 Task 2).
// Asserts each walker-required SD field is preserved by the trim function and
// that bindings outside `strength: required` are dropped intentionally.
import { describe, it, expect } from 'vitest';
import { trim } from '../lib/trim-profile.mjs';

describe('trim-profile (T-44-01)', () => {
  const SAMPLE_SD = {
    resourceType: 'StructureDefinition',
    url: 'http://example.com/foo',
    name: 'FooProfile',
    type: 'Foo',
    extra: 'should-be-dropped',
    snapshot: {
      element: [
        {
          path: 'Foo',
          min: 0,
          max: '*',
          mustSupport: true,
          sliceName: 'baseSlice',
          type: [{ code: 'Foo' }],
          binding: { strength: 'required', valueSet: 'http://vs' },
        },
        {
          path: 'Foo.x',
          binding: { strength: 'preferred', valueSet: 'http://vs2' },
        },
        {
          path: 'Foo.y',
        },
      ],
    },
  };

  it('preserves path on every element', () => {
    const result = trim(SAMPLE_SD);
    expect(result.snapshot.element.map((e) => e.path)).toEqual([
      'Foo',
      'Foo.x',
      'Foo.y',
    ]);
  });

  it('preserves sliceName when defined', () => {
    const result = trim(SAMPLE_SD);
    expect(result.snapshot.element[0].sliceName).toBe('baseSlice');
    expect(result.snapshot.element[1].sliceName).toBeUndefined();
  });

  it('preserves min/max when defined', () => {
    const result = trim(SAMPLE_SD);
    expect(result.snapshot.element[0].min).toBe(0);
    expect(result.snapshot.element[0].max).toBe('*');
    expect(result.snapshot.element[2].min).toBeUndefined();
    expect(result.snapshot.element[2].max).toBeUndefined();
  });

  it('preserves mustSupport when defined', () => {
    const result = trim(SAMPLE_SD);
    expect(result.snapshot.element[0].mustSupport).toBe(true);
    expect(result.snapshot.element[2].mustSupport).toBeUndefined();
  });

  it('preserves type when defined', () => {
    const result = trim(SAMPLE_SD);
    expect(result.snapshot.element[0].type).toEqual([{ code: 'Foo' }]);
    expect(result.snapshot.element[2].type).toBeUndefined();
  });

  it('preserves binding only when strength is required', () => {
    const result = trim(SAMPLE_SD);
    expect(result.snapshot.element[0].binding).toEqual({
      strength: 'required',
      valueSet: 'http://vs',
    });
    // preferred binding dropped
    expect(result.snapshot.element[1].binding).toBeUndefined();
  });

  it('drops top-level fields outside the trim shape (e.g. `extra`)', () => {
    const result = trim(SAMPLE_SD);
    expect(result).toHaveProperty('resourceType', 'StructureDefinition');
    expect(result).toHaveProperty('url', 'http://example.com/foo');
    expect(result).toHaveProperty('name', 'FooProfile');
    expect(result).toHaveProperty('type', 'Foo');
    expect(result).not.toHaveProperty('extra');
  });

  it('handles missing snapshot.element gracefully (returns empty array)', () => {
    const result = trim({
      resourceType: 'StructureDefinition',
      url: 'http://example.com/empty',
      name: 'Empty',
      type: 'Empty',
    });
    expect(result.snapshot.element).toEqual([]);
  });
});
