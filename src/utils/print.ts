/**
 * Print utility for precision direct printer output
 * Ensures correct page sizes (F4 / Folio, A4, Landscape) and cleans up margins
 */

export interface PrintOptions {
  paperSize?: 'F4' | 'A4' | 'A4-LANDSCAPE' | 'AUTO';
  margins?: string; // e.g. '0', '5mm', '8mm 6mm'
  bodyClass?: string;
  delayMs?: number;
}

export function triggerDirectPrint(options: PrintOptions = {}) {
  const {
    paperSize = 'A4',
    margins = paperSize === 'F4' || paperSize === 'A4' ? '0' : '6mm',
    bodyClass,
    delayMs = 200,
  } = options;

  // Determine @page size rule
  let sizeRule = 'A4 portrait';
  if (paperSize === 'F4') {
    sizeRule = '215mm 330mm portrait';
  } else if (paperSize === 'A4') {
    sizeRule = '210mm 297mm portrait';
  } else if (paperSize === 'A4-LANDSCAPE') {
    sizeRule = '297mm 210mm landscape';
  }

  // Remove existing print style element if any
  const existingStyle = document.getElementById('dynamic-print-page-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Inject exact @page style tag into document head
  const styleEl = document.createElement('style');
  styleEl.id = 'dynamic-print-page-style';
  styleEl.innerHTML = `
    @media print {
      @page {
        size: ${sizeRule} !important;
        margin: ${margins} !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  if (bodyClass) {
    document.body.classList.add(bodyClass);
  }

  // Allow layout and QR images to stabilize before triggering native print dialog
  setTimeout(() => {
    window.print();
  }, delayMs);

  const cleanup = () => {
    if (bodyClass) {
      document.body.classList.remove(bodyClass);
    }
    const injected = document.getElementById('dynamic-print-page-style');
    if (injected) {
      injected.remove();
    }
  };

  window.onafterprint = cleanup;

  // Fallback cleanup in case onafterprint doesn't fire
  setTimeout(cleanup, 60000);
}
