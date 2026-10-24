/**
 * Tests for the save buttons' hook: Import Save opens the hidden file picker, Export Save
 * downloads the save that getSaveState builds, and New Game asks before it resets.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSaveLoadSystem } from '../components/SaveLoadSystem';
import type { ExtendedGameState } from '../utils/saveSystem';

function SaveButtons({ getSaveState, resetGame }: { getSaveState: () => ExtendedGameState | null; resetGame: () => void }) {
  const { fileInput, handleExportSave, handleImportSave, handleResetGame, loadingStates } = useSaveLoadSystem({ getSaveState, resetGame });
  return (
    <>
      {fileInput}
      <button onClick={handleExportSave} aria-busy={loadingStates.isExporting}>Export Save</button>
      <button onClick={handleImportSave}>Import Save</button>
      <button onClick={handleResetGame}>New Game</button>
    </>
  );
}

const readText = (blob: Blob) => new Promise<string>(resolve => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.readAsText(blob);
});

const { createObjectURL, revokeObjectURL } = URL;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

describe('useSaveLoadSystem', () => {
  it('opens its hidden file picker for Import Save', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    render(<SaveButtons getSaveState={() => null} resetGame={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Import Save' }));

    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.contexts[0]).toMatchObject({ type: 'file', accept: '.json' });
  });

  it('downloads the save that getSaveState builds', async () => {
    vi.useFakeTimers();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:save';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const save = { money: 1234 } as unknown as ExtendedGameState;
    render(<SaveButtons getSaveState={() => save} resetGame={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Save' }));
    expect(screen.getByRole('button', { name: 'Export Save' })).toHaveAttribute('aria-busy', 'true');
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(click).toHaveBeenCalledTimes(1);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(/^farm-idle-save_.+[.]json$/);
    expect(screen.getByRole('button', { name: 'Export Save' })).toHaveAttribute('aria-busy', 'false');
    vi.useRealTimers();
    expect(JSON.parse(await readText(blobs[0]))).toMatchObject({ money: 1234, canningVersion: 3 });
  });

  it('asks before New Game resets the farm', () => {
    vi.useFakeTimers();
    const resetGame = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<SaveButtons getSaveState={() => null} resetGame={resetGame} />);

    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(resetGame).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'New Game' }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(resetGame).toHaveBeenCalledTimes(1);
  });
});
