interface BreakingTransition {
  from: string;
  to: string;
  message: string;
}

// Explicitly flag only known breaking migrations.
const BREAKING_TRANSITIONS: BreakingTransition[] = [
  {
    from: '2.1.0',
    to: '2.2.0',
    message: 'This file may require migration because the metadata version model changed between app versions 2.1.0 and 2.2.0.',
  },
  {
    from: '2.2.0',
    to: '2.3.0',
    message:
      'This project was saved before cloud encryption was enabled (app 2.2.0 → 2.3.0). ' +
      'It will load normally, and will be encrypted the next time you save it to the cloud.',
  },
];

export function getBreakingMigrationWarning(importedAppVersion?: string | null, currentAppVersion?: string | null): string | null {
  if (!importedAppVersion || !currentAppVersion) return null;

  const match = BREAKING_TRANSITIONS.find(
    (transition) => transition.from === importedAppVersion && transition.to === currentAppVersion,
  );

  return match ? match.message : null;
}
