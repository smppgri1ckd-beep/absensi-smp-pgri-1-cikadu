import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string, size = 260): Promise<string> {
  try {
    return await QRCode.toDataURL(String(text).trim(), {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

// Compress and neutralize dark backgrounds on uploaded student photos or school logos
export function processImageFile(file: File, maxWidth = 320, quality = 0.9): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(e.target?.result as string || '');
          return;
        }

        // 1. Fill entire background with pure white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // 2. Draw image on top
        ctx.drawImage(img, 0, 0, w, h);

        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // 3. Neutralize transparent or edge dark artifacts
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            // If pixel is transparent or semi-transparent, force to pure white
            if (alpha < 240) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              data[i + 3] = 255;
            } else if (data[i] < 30 && data[i + 1] < 30 && data[i + 2] < 30) {
              // Edge dark pixels neutralization
              const isEdge =
                i < w * 4 * 6 ||
                i > data.length - w * 4 * 6 ||
                i % (w * 4) < 24 ||
                i % (w * 4) > w * 4 - 24;
              if (isEdge) {
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // ignore canvas getImageData security errors on external cross origin
        }

        const isPng = file.type === 'image/png' || maxWidth <= 400;
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
