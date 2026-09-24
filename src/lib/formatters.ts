/**
 * Utilidades de formateo para la aplicación EcomShop Content Platform.
 */

/**
 * Formatea una fecha o marca temporal ISO al estándar neutro de Madrid: "24 sep · 11:38"
 */
export function formatMadridDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const formatter = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    const formatted = formatter.format(d); // e.g. "24 sep 11:38" o "24 sept, 11:38"
    return formatted.replace(",", "").replace(/\s+(\d{2}:\d{2})$/, " · $1");
  } catch {
    return String(dateInput);
  }
}

/**
 * Formatea importes en Euros con formato europeo neutro: "0,00 €"
 */
export function formatEur(amount?: number | null): string {
  if (typeof amount !== "number" || isNaN(amount)) return "0,00 €";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(amount);
}
