export type CsvCell = string | number | boolean | null | undefined;
export type CsvRow = Record<string, string>;

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): CsvRow[] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);

  const [rawHeaders, ...dataRows] = rows;
  const headers = rawHeaders?.map((header, index) => (
    index === 0 ? header.replace(/^\uFEFF/, '').trim() : header.trim()
  ));
  if (!headers || headers.length === 0) return [];

  return dataRows
    .map((dataRow) => headers.reduce<Record<string, string>>((record, header, index) => {
      record[header.trim()] = dataRow[index]?.trim() ?? '';
      return record;
    }, {}))
    .filter((record) => Object.values(record).some(Boolean));
}

export function getCsvValue(row: CsvRow, aliases: string | string[], fallback = ''): string {
  const aliasList = Array.isArray(aliases) ? aliases : [aliases];

  for (const alias of aliasList) {
    const direct = row[alias];
    if (direct !== undefined) return direct;
  }

  const normalizedRow = Object.entries(row).reduce<Record<string, string>>((record, [key, value]) => {
    const normalized = normalizeCsvKey(key);
    if (record[normalized] === undefined || record[normalized] === '') {
      record[normalized] = value;
    }
    return record;
  }, {});

  for (const alias of aliasList) {
    const value = normalizedRow[normalizeCsvKey(alias)];
    if (value !== undefined) return value;
  }

  return fallback;
}

function normalizeCsvKey(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function detectDelimiter(text: string): ',' | ';' | '\t' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = {
    ',': countDelimiter(firstLine, ','),
    ';': countDelimiter(firstLine, ';'),
    '\t': countDelimiter(firstLine, '\t'),
  };
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ',') as ',' | ';' | '\t';
}

function countDelimiter(line: string, delimiter: ',' | ';' | '\t') {
  let count = 0;
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') index += 1;
      else inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) count += 1;
  }
  return count;
}

export function parseBoolean(value: string | undefined, fallback = true): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'ya', 'yes', 'aktif', 'active'].includes(normalized);
}

export function parseNumber(value: string | undefined, fallback = 0): number {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return fallback;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function findDuplicateValues(values: string[]): string[] {
  const counts = values.reduce<Record<string, { label: string; count: number }>>((record, value) => {
    const label = value.trim();
    if (!label) return record;
    const key = label.toUpperCase();
    record[key] = record[key] ?? { label, count: 0 };
    record[key].count += 1;
    return record;
  }, {});

  return Object.values(counts)
    .filter((item) => item.count > 1)
    .map((item) => item.label);
}
