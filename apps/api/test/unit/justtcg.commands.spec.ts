import {
  SyncAllCommand,
  SyncCatalogCommand,
  SyncDictionariesCommand,
} from '../../src/modules/justtcg/cli/justtcg.commands';

describe('JustTCG commands', () => {
  it('runs dictionaries command and parses options', async () => {
    const syncService = { syncDictionaries: jest.fn().mockResolvedValue(undefined) };
    const cmd = new SyncDictionariesCommand(syncService as any);

    await cmd.run([], { only: 'games,sets', dryRun: true, fresh: true } as any);

    expect(syncService.syncDictionaries).toHaveBeenCalledWith({
      only: ['games', 'sets'],
      dryRun: true,
      fresh: true,
    });
    expect(cmd.parseOnly('a,b')).toBe('a,b');
    expect(cmd.parseDryRun(true)).toBe(true);
    expect(cmd.parseFresh(true)).toBe(true);
  });

  it('runs catalog command', async () => {
    const syncService = { syncCatalog: jest.fn().mockResolvedValue(undefined) };
    const cmd = new SyncCatalogCommand(syncService as any);

    await cmd.run([], { dryRun: true, fresh: false } as any);
    expect(syncService.syncCatalog).toHaveBeenCalledWith({ dryRun: true, fresh: false });
  });

  it('runs all command', async () => {
    const syncService = { syncAll: jest.fn().mockResolvedValue(undefined) };
    const cmd = new SyncAllCommand(syncService as any);

    await cmd.run([], { only: 'games', dryRun: false, fresh: true } as any);
    expect(syncService.syncAll).toHaveBeenCalledWith({ only: ['games'], dryRun: false, fresh: true });
  });
});
