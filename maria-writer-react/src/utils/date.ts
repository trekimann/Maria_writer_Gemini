const pad2 = (n: number) => String(n).padStart(2, '0');

export const normalizeDDMMYYYY = (input: string): string | null => {
  const raw = input.trim();
  if (!raw) return null;

  // dd/mm/yyyy or dd-mm-yyyy
  let m = raw.match(/^\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s*$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
      return null;
    }
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }

  // yyyy-mm-dd or yyyy/mm/dd
  m = raw.match(/^\s*(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\s*$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
      return null;
    }
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }

  return null;
};

export const formatDDMMYYYYOrEmpty = (value?: string | null): string => {
  if (!value) return '';
  return normalizeDDMMYYYY(value) ?? value;
};

export const normalizeDDMMYYYYHHMMSS = (input: string): string | null => {
  const raw = input.trim();
  if (!raw) return null;

  // dd/mm/yyyy [hh[:mm[:ss]]]
  let m = raw.match(/^\s*(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?\s*$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    const hour = m[4] ? Number(m[4]) : 0;
    const minute = m[5] ? Number(m[5]) : 0;
    const second = m[6] ? Number(m[6]) : 0;

    const dt = new Date(year, month - 1, day, hour, minute, second);
    // Validate exact components (Date will roll over invalid values)
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59 ||
      second < 0 || second > 59
    ) {
      return null;
    }
    return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  }

  // yyyy-mm-dd[ T]hh:mm[:ss] or yyyy/mm/dd
  m = raw.match(/^\s*(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[\sT]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?\s*$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = m[4] ? Number(m[4]) : 0;
    const minute = m[5] ? Number(m[5]) : 0;
    const second = m[6] ? Number(m[6]) : 0;

    const dt = new Date(year, month - 1, day, hour, minute, second);
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day ||
      hour < 0 || hour > 23 ||
      minute < 0 || minute > 59 ||
      second < 0 || second > 59
    ) {
      return null;
    }
    return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  }

  // Accept date-only legacy and normalize to midnight.
  const dateOnly = normalizeDDMMYYYY(raw);
  if (dateOnly) return `${dateOnly} 00:00:00`;

  return null;
};

export const parseDDMMYYYYHHMMSS = (value: string): Date | null => {
  const normalized = normalizeDDMMYYYYHHMMSS(value);
  if (!normalized) return null;
  const m = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  return new Date(year, month - 1, day, hour, minute, second);
};

export const formatDDMMYYYYHHMMSSFromDate = (dt: Date): string => {
  const day = dt.getDate();
  const month = dt.getMonth() + 1;
  const year = dt.getFullYear();
  const hour = dt.getHours();
  const minute = dt.getMinutes();
  const second = dt.getSeconds();
  return `${pad2(day)}/${pad2(month)}/${year} ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
};

export const formatDateTimeOrEmpty = (value?: string | null): string => {
  if (!value) return '';
  return normalizeDDMMYYYYHHMMSS(value) ?? value;
};

/**
 * Calculate age from date of birth to a reference date (default: today)
 * Works with both dd/MM/yyyy and dd/MM/yyyy HH:mm:ss formats
 * Returns age in years as a number, or null if dob is invalid
 */
export const calculateAge = (dob: string, referenceDate: Date = new Date()): number | null => {
  if (!dob) return null;
  
  const parsedDate = parseDDMMYYYYHHMMSS(dob);
  if (!parsedDate) return null;
  
  let age = referenceDate.getFullYear() - parsedDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsedDate.getMonth();
  
  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < parsedDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Get display age: returns the stored age if available, otherwise calculates from dob
 * Returns null if neither age nor dob is available
 * 
 * @param storedAge - The manually entered age (if any)
 * @param dob - The date of birth
 * @param storyCurrentDate - The story's "current date" (optional, defaults to today)
 */
export const getDisplayAge = (
  storedAge: string | undefined, 
  dob: string | undefined,
  storyCurrentDate?: string
): number | null => {
  if (storedAge && storedAge.trim()) {
    const parsed = parseInt(storedAge, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  if (dob) {
    // Use story's current date if provided, otherwise use today
    let referenceDate: Date;
    if (storyCurrentDate) {
      const parsedStoryDate = parseDDMMYYYYHHMMSS(storyCurrentDate);
      referenceDate = parsedStoryDate || new Date();
    } else {
      referenceDate = new Date();
    }
    
    return calculateAge(dob, referenceDate);
  }
  
  return null;
};
