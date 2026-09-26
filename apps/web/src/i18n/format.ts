// Formats de nombres et de dates qui suivent la langue courante. Les formateurs se déclarent une
// fois au niveau du module, comme avant, mais relisent la langue à chaque appel.
import { getLocale, intlLocale } from "./index";

const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();

export function numberFormatter(options: Intl.NumberFormatOptions = {}) {
  const key = JSON.stringify(options);
  const get = () => {
    const id = `${getLocale()}|${key}`;
    let fmt = numberCache.get(id);
    if (!fmt) {
      fmt = new Intl.NumberFormat(intlLocale(), options);
      numberCache.set(id, fmt);
    }
    return fmt;
  };
  return { format: (n: number) => get().format(n) };
}

export function dateFormatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  const get = () => {
    const id = `${getLocale()}|${key}`;
    let fmt = dateCache.get(id);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat(intlLocale(), options);
      dateCache.set(id, fmt);
    }
    return fmt;
  };
  return { format: (d: Date | number) => get().format(d) };
}

/** « 12,5 % » en français, « 12.5% » en anglais. */
export function percentText(formatted: string): string {
  return getLocale() === "fr" ? `${formatted} %` : `${formatted}%`;
}
