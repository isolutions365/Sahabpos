/**
 * UI Feature Flags for Invoice Preview & Printing Options
 * 
 * Set flags to `true` to enable UI options, or `false` to temporarily hide them.
 * All underlying data models, ZATCA TLV encoding logic, QR generation, public routing,
 * and A4 print templates remain 100% intact and available in the code.
 */
export const INVOICE_UI_FLAGS = {
  // Show/Hide ZATCA Phase 1 inspection button in invoice preview modal
  showZatcaButton: false,

  // Show/Hide Public Link customer verification button
  showPublicLink: false,

  // Show/Hide A4 Tax Invoice format selector & print options
  showA4Invoice: false,
};
