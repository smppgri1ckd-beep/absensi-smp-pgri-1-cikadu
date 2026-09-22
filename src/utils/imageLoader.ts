/**
 * Helper to safely load an image URL as an HTMLImageElement or data URL
 * so it can be added to jsPDF via addImage
 */
export function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Standard vector SVG for the official PGRI school emblem
 */
const PGRI_EMBLEM_SVG = `<svg viewBox="0 0 200 200" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="96" fill="#ffffff" stroke="#003366" stroke-width="4" />
  <circle cx="100" cy="100" r="88" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
  <!-- Left Laurel / Rice -->
  <path d="M48,135 C38,100 48,65 75,45 C70,60 68,85 78,110 C82,120 75,130 65,135 Z" fill="#15803d" opacity="0.85" />
  <!-- Right Laurel / Rice -->
  <path d="M152,135 C162,100 152,65 125,45 C130,60 132,85 122,110 C118,120 125,130 135,135 Z" fill="#15803d" opacity="0.85" />
  <!-- Golden Torch -->
  <path d="M93,80 L107,80 L104,135 L96,135 Z" fill="#f59e0b" stroke="#b45309" stroke-width="2" />
  <rect x="90" y="75" width="20" height="7" rx="2" fill="#d97706" />
  <!-- Torch Flame -->
  <path d="M100,22 C112,42 122,55 110,75 C100,75 92,68 90,62 C88,72 82,75 78,75 C70,62 82,45 100,22 Z" fill="#dc2626" />
  <path d="M100,32 C106,46 112,56 105,68 C98,68 94,62 93,58 C91,65 87,68 85,68 C80,58 88,46 100,32 Z" fill="#fbbf24" />
  <!-- Open Book -->
  <path d="M100,120 C82,110 65,112 52,118 L52,142 C68,136 84,136 100,146 Z" fill="#ffffff" stroke="#1e3a8a" stroke-width="2.5" />
  <path d="M100,120 C118,110 135,112 148,118 L148,142 C132,136 116,136 100,146 Z" fill="#ffffff" stroke="#1e3a8a" stroke-width="2.5" />
  <line x1="100" y1="120" x2="100" y2="146" stroke="#1e3a8a" stroke-width="3" />
  <!-- PGRI Banner -->
  <rect x="74" y="126" width="52" height="15" rx="3" fill="#dc2626" />
  <text x="100" y="138" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="900" font-family="sans-serif" letter-spacing="1">PGRI</text>
  <!-- Curved Bottom Text Arc -->
  <path id="txtArc" d="M 38 152 A 75 75 0 0 0 162 152" fill="none" stroke="none" />
  <text fill="#003366" font-size="10.5" font-weight="900" letter-spacing="0.5">
    <textPath href="#txtArc" startOffset="50%" text-anchor="middle">SMP PGRI 1 CIKADU</textPath>
  </text>
</svg>`;

let cachedDefaultLogoDataUrl: string | null = null;

/**
 * Generates a high-resolution PNG data URL for the default PGRI school logo
 */
export function getDefaultSchoolLogoDataUrl(): Promise<string> {
  if (cachedDefaultLogoDataUrl) {
    return Promise.resolve(cachedDefaultLogoDataUrl);
  }

  return new Promise((resolve) => {
    try {
      const svgBlob = new Blob([PGRI_EMBLEM_SVG], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0, 300, 300);
          const dataUrl = canvas.toDataURL('image/png');
          cachedDefaultLogoDataUrl = dataUrl;
          URL.revokeObjectURL(blobURL);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(blobURL);
          resolve('');
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(blobURL);
        resolve('');
      };
      image.src = blobURL;
    } catch {
      resolve('');
    }
  });
}

/**
 * Safely fetches the school logo for PDF reports.
 * Falls back gracefully to the embedded official PGRI emblem if custom URL is missing or blocked by CORS.
 */
export async function getSchoolLogoImage(customUrl?: string): Promise<HTMLImageElement | string | null> {
  if (customUrl && !customUrl.includes('flaticon') && !customUrl.includes('placehold')) {
    const loaded = await loadImageElement(customUrl);
    if (loaded) return loaded;
  }
  const defaultDataUrl = await getDefaultSchoolLogoDataUrl();
  if (defaultDataUrl) return defaultDataUrl;
  return null;
}

