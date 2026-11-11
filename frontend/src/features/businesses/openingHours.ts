import type { OpeningHoursRange } from '../../api/businesses.ts';
import { strings } from '../../strings.ts';

// Directory spec, "Opening hours display" (design D-6). Times are formatted by hand, since the output of
// Intl.DateTimeFormat for es-CO differs between browsers and the spec fixes the exact text.

/** `HH:MM` (24-hour) to "7:00 a. m."; `00:00` and `24:00` are both "12:00 a. m.". */
function formatTime(time: string): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const hourOfDay = hours % 24;
  const hour12 = hourOfDay % 12 === 0 ? 12 : hourOfDay % 12;
  const period = hourOfDay < 12 ? strings.beforeNoon : strings.afterNoon;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/** The hours of one day: its ranges joined by " y ", or "Cerrado". */
function formatDay(ranges: OpeningHoursRange[]): string {
  if (ranges.length === 0) {
    return strings.closedDay;
  }
  return ranges.map((range) => `${formatTime(range.opens)} – ${formatTime(range.closes)}`).join(` ${strings.and} `);
}

/** "Sábado", "Sábado y domingo", or "Lunes a viernes", from day indexes 0 (Monday) to 6 (Sunday). */
function formatDayGroup(first: number, last: number): string {
  const firstName = strings.dayNames[first] ?? '';
  if (first === last) {
    return firstName;
  }
  const lastName = (strings.dayNames[last] ?? '').toLowerCase();
  return `${firstName} ${last === first + 1 ? strings.and : strings.through} ${lastName}`;
}

/**
 * Turns a business's ranges, as sorted by the API, into the lines of the "Horario" row:
 * Monday to Sunday, one line per run of consecutive days with the same hours. No hours, no lines.
 */
export function formatOpeningHours(ranges: OpeningHoursRange[]): string[] {
  if (ranges.length === 0) {
    return [];
  }
  const days = strings.dayNames.map((_name, index) =>
    formatDay(ranges.filter((range) => range.dayOfWeek === index + 1)),
  );

  const lines: string[] = [];
  let groupStart = 0;
  days.forEach((hours, index) => {
    if (days[index + 1] !== hours) {
      lines.push(`${formatDayGroup(groupStart, index)} · ${hours}`);
      groupStart = index + 1;
    }
  });
  return lines;
}
