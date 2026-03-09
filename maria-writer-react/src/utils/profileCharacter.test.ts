import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addProfileAsCharacter, buildCharacterFromProfile } from './profileCharacter';
import type { AuthUser } from '../services/authService';

const mockUuid = vi.fn();

vi.mock('uuid', () => ({
  v4: () => mockUuid(),
}));

const MOCK_USER: AuthUser = {
  id: 'u-1',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  role: 'USER',
  tier: 'DEFAULT',
  genreTags: 'Fantasy, Sci-Fi',
  profilePicture: 'data:image/jpeg;base64,abc',
  dob: '01/01/2001 00:00:00',
  aliases: 'Tess, Writer',
  bio: 'Writes dramatic space opera.',
};

describe('profileCharacter utils', () => {
  beforeEach(() => {
    mockUuid.mockReset();
    mockUuid.mockReturnValue('char-123');
  });

  it('builds a character from profile fields', () => {
    expect(buildCharacterFromProfile(MOCK_USER)).toEqual({
      id: 'char-123',
      name: 'Test User',
      picture: 'data:image/jpeg;base64,abc',
      dob: '01/01/2001 00:00:00',
      description: 'Writes dramatic space opera.',
      tags: ['Fantasy', 'Sci-Fi'],
      nicknames: ['Tess', 'Writer', 'testuser'],
      color: '#4f46e5',
    });
  });

  it('dispatches the actions needed to open the new character in Codex', () => {
    const dispatch = vi.fn();

    const createdId = addProfileAsCharacter(MOCK_USER, dispatch);

    expect(createdId).toBe('char-123');
    expect(dispatch).toHaveBeenNthCalledWith(1, expect.objectContaining({
      type: 'ADD_CHARACTER',
      payload: expect.objectContaining({ id: 'char-123', name: 'Test User' }),
    }));
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SET_CONTEXT_MODE', payload: 'codex' });
    expect(dispatch).toHaveBeenNthCalledWith(3, { type: 'SET_CODEX_TAB', payload: 'characters' });
    expect(dispatch).toHaveBeenNthCalledWith(4, { type: 'SET_VIEWING_ITEM', payload: 'char-123' });
  });
});
