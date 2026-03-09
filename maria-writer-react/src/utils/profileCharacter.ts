import { v4 as uuidv4 } from 'uuid';
import { AuthUser } from '../services/authService';
import { Character } from '../types';

export type ProfileCharacterAction =
  | { type: 'ADD_CHARACTER'; payload: Character }
  | { type: 'SET_CONTEXT_MODE'; payload: 'codex' }
  | { type: 'SET_CODEX_TAB'; payload: 'characters' }
  | { type: 'SET_VIEWING_ITEM'; payload: string };

function splitCsv(value?: string | null): string[] {
  return value
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
}

export function buildCharacterFromProfile(user: AuthUser): Character {
  const id = uuidv4();
  const name = user.displayName?.trim() || user.username;
  const aliasCandidates = [
    ...splitCsv(user.aliases),
    user.displayName && user.displayName !== user.username ? user.username : null,
  ].filter((value): value is string => Boolean(value));

  return {
    id,
    name,
    picture: user.profilePicture || '',
    dob: user.dob || '',
    description: user.bio || '',
    tags: splitCsv(user.genreTags),
    nicknames: Array.from(new Set(aliasCandidates)),
    color: user.profileColor || '#4f46e5',
  };
}

export function addProfileAsCharacter(
  user: AuthUser,
  dispatch: (action: ProfileCharacterAction) => void,
): string {
  const character = buildCharacterFromProfile(user);

  dispatch({ type: 'ADD_CHARACTER', payload: character });
  dispatch({ type: 'SET_CONTEXT_MODE', payload: 'codex' });
  dispatch({ type: 'SET_CODEX_TAB', payload: 'characters' });
  dispatch({ type: 'SET_VIEWING_ITEM', payload: character.id });

  return character.id;
}
