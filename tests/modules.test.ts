import { describe, expect, it, vi } from 'vitest';
import { getSpaceModules, hasModule, setModule, AVAILABLE_SPACE_MODULES } from '@/lib/modules';

const createMockClient = () => {
  const findUnique = vi.fn();
  const update = vi.fn();
  return {
    tenant: {
      findUnique,
      update
    }
  };
};

describe('space modules helper', () => {
  it('returns false when the module is missing', async () => {
    const client = createMockClient();
    client.tenant.findUnique.mockResolvedValue({ modules: [] });
    await expect(hasModule('space-1', 'social', { client })).resolves.toBe(false);
  });

  it('returns true when the module exists', async () => {
    const client = createMockClient();
    client.tenant.findUnique.mockResolvedValue({ modules: ['social'] });
    await expect(hasModule('space-1', 'social', { client })).resolves.toBe(true);
  });

  it('adds or removes modules via setModule', async () => {
    const client = createMockClient();
    client.tenant.findUnique.mockResolvedValueOnce({ modules: [] });
    client.tenant.update.mockResolvedValueOnce({});
    await setModule('space-1', 'social', true, { client });
    expect(client.tenant.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: {
        modules: ['social']
      }
    });

    client.tenant.findUnique.mockResolvedValueOnce({ modules: ['social'] });
    client.tenant.update.mockResolvedValueOnce({});
    await setModule('space-1', 'social', false, { client });
    expect(client.tenant.update).toHaveBeenCalledWith({
      where: { id: 'space-1' },
      data: {
        modules: []
      }
    });
  });
});
