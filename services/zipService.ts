
import type { AlbumOptions, ImageItem, Palette } from '../types';

// #region: Image and Color Utilities

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load image resource: ${src.substring(0, 50)}...`));
        img.src = src;
    });
};

const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
};

const getLuminance = (r: number, g: number, b: number): number => {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7154 + a[2] * 0.0722;
};

export const computePalette = async (logoSrc: string): Promise<Palette> => {
    try {
        const img = await loadImage(logoSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas context not available for color extraction');

        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const dominantColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

        const luminance = getLuminance(r, g, b);
        const isDark = luminance < 0.4;

        return {
            primary: dominantColor,
            background: isDark ? '#ffffff' : '#f8fafc', // white or slate-50
            card: isDark ? '#f8fafc' : '#ffffff', // slate-50 or white
            textPrimary: '#0f172a', // slate-900
            textSecondary: '#64748b', // slate-500
        };
    } catch (error) {
        console.error("Failed to compute palette from logo, using default:", error);
        return createDefaultPalette();
    }
};

export const createDefaultPalette = (): Palette => ({
    primary: '#3b82f6', // blue-500
    background: '#f8fafc', // slate-50
    card: '#ffffff',
    textPrimary: '#0f172a', // slate-900
    textSecondary: '#64748b', // slate-500
});

// #endregion

// #region: Layout Utilities

const getGridConfiguration = (imageCount: number): { COLS: number; ROWS: number } => {
    if (imageCount <= 3) return { COLS: imageCount, ROWS: 1 };
    if (imageCount === 4) return { COLS: 2, ROWS: 2 };
    if (imageCount <= 6) return { COLS: 3, ROWS: 2 };
    if (imageCount <= 9) return { COLS: 3, ROWS: 3 };
    return { COLS: 4, ROWS: Math.ceil(imageCount / 4) }; // Default for more images
};

const parseAspectRatio = (ratioStr: string): number => {
    if (ratioStr === 'auto') return 0;
    const parts = ratioStr.split(':').map(Number);
    return parts[0] / parts[1];
};

// #endregion


/**
 * Creates a customizable, branded collage image from a set of images.
 * @returns A promise that resolves with the data URL of the collage image.
 */
export const createBrandedAlbum = async (
    images: ImageItem[],
    options: AlbumOptions,
    resolution: number = 2048,
    onProgress?: (progress: number) => void
): Promise<string> => {
    onProgress?.(0);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const { brandInfo, palette, typography, showWatermark, watermarkOpacity, imageAspectRatio, imageFit } = options;
    const scale = resolution / 2048;

    canvas.width = resolution;
    canvas.height = resolution;

    // --- Dynamic Layout Calculation ---
    const { COLS, ROWS } = getGridConfiguration(images.length);
    const PADDING = 150 * scale;
    const HEADER_HEIGHT = 250 * scale;
    const FOOTER_HEIGHT = 150 * scale;
    const GAP = 60 * scale;
    const BORDER_RADIUS = 24 * scale;
    
    const availableWidth = canvas.width - (PADDING * 2) - (GAP * (COLS - 1));
    const CELL_WIDTH = availableWidth / COLS;
    const availableHeight = canvas.height - HEADER_HEIGHT - FOOTER_HEIGHT - (GAP * (ROWS - 1));
    const CELL_HEIGHT = availableHeight / ROWS;
    const LABEL_AREA_HEIGHT = 100 * scale;
    const IMAGE_AREA_HEIGHT = CELL_HEIGHT - LABEL_AREA_HEIGHT;

    // 1. Background
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onProgress?.(5);

    // 2. Load images
    const allSrcs = images.map(i => i.src);
    if (brandInfo.logoSrc) allSrcs.push(brandInfo.logoSrc);
    
    const loadedImages = await Promise.all(allSrcs.map(loadImage));
    const contentImages = loadedImages.slice(0, images.length);
    const logoImage = brandInfo.logoSrc ? loadedImages[loadedImages.length - 1] : null;
    onProgress?.(20);

    // 3. Header
    const hasLogo = !!(logoImage && brandInfo.logoSrc);
    const logoSize = 100 * scale;
    const headerContentX = hasLogo ? PADDING + logoSize + 30 * scale : canvas.width / 2;
    const headerTextAlign = hasLogo ? 'left' : 'center';

    if (hasLogo && logoImage) {
        ctx.drawImage(logoImage, PADDING, PADDING - logoSize / 2, logoSize, logoSize);
    }

    ctx.fillStyle = palette.textPrimary;
    ctx.font = `bold ${80 * scale}px ${typography.titleFont}`;
    ctx.textAlign = headerTextAlign;
    ctx.fillText(brandInfo.name, headerContentX, PADDING + (brandInfo.slogan ? 0 : 25 * scale));

    if (brandInfo.slogan) {
        ctx.fillStyle = palette.textSecondary;
        ctx.font = `${40 * scale}px ${typography.bodyFont}`;
        ctx.fillText(brandInfo.slogan, headerContentX, PADDING + 60 * scale);
    }
    
    onProgress?.(30);
    
    // 4. Image Cards
    contentImages.forEach((img, index) => {
        const row = Math.floor(index / COLS);
        const col = index % COLS;

        // Center the last row if it's not full
        const itemsInLastRow = images.length % COLS;
        const isLastRow = row === ROWS - 1;
        let xOffset = 0;
        if (isLastRow && itemsInLastRow > 0) {
            const lastRowWidth = (itemsInLastRow * CELL_WIDTH) + ((itemsInLastRow - 1) * GAP);
            xOffset = (availableWidth - lastRowWidth) / 2;
        }

        const x = PADDING + col * (CELL_WIDTH + GAP) + xOffset;
        const y = HEADER_HEIGHT + row * (CELL_HEIGHT + GAP);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 30 * scale;
        ctx.shadowOffsetY = 8 * scale;
        ctx.fillStyle = palette.card;
        drawRoundRect(ctx, x, y, CELL_WIDTH, CELL_HEIGHT, BORDER_RADIUS);
        ctx.fill();
        ctx.restore();

        const cellPadding = 25 * scale;
        const imgContainerX = x + cellPadding;
        const imgContainerY = y + cellPadding;
        const imgContainerWidth = CELL_WIDTH - cellPadding * 2;
        const imgContainerHeight = IMAGE_AREA_HEIGHT - cellPadding * 2;
        
        // --- Image Drawing Logic ---
        if (imageFit === 'contain' || imageAspectRatio === 'auto') {
            const imgScale = Math.min(imgContainerWidth / img.width, imgContainerHeight / img.height);
            const scaledW = img.width * imgScale;
            const scaledH = img.height * imgScale;
            const imgX = imgContainerX + (imgContainerWidth - scaledW) / 2;
            const imgY = imgContainerY + (imgContainerHeight - scaledH) / 2;
            ctx.drawImage(img, imgX, imgY, scaledW, scaledH);
        } else { // 'cover' with a specific aspect ratio
            const targetRatio = parseAspectRatio(imageAspectRatio);
            
            let targetW = imgContainerWidth;
            let targetH = targetW / targetRatio;
            if (targetH > imgContainerHeight) {
                targetH = imgContainerHeight;
                targetW = targetH * targetRatio;
            }
            const dx = imgContainerX + (imgContainerWidth - targetW) / 2;
            const dy = imgContainerY + (imgContainerHeight - targetH) / 2;

            const sourceRatio = img.width / img.height;
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

            if (sourceRatio > targetRatio) { // Source is wider, crop sides
                sWidth = img.height * targetRatio;
                sx = (img.width - sWidth) / 2;
            } else { // Source is taller, crop top/bottom
                sHeight = img.width / targetRatio;
                sy = (img.height - sHeight) / 2;
            }
            ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, targetW, targetH);
        }
        
        if (showWatermark && logoImage) {
            const watermarkScale = 0.25;
            const watermarkW = Math.min(logoImage.width * watermarkScale, CELL_WIDTH * 0.3);
            const watermarkH = (watermarkW / logoImage.width) * logoImage.height;
            ctx.globalAlpha = watermarkOpacity;
            ctx.drawImage(logoImage, x + CELL_WIDTH - watermarkW - cellPadding, y + IMAGE_AREA_HEIGHT - watermarkH - cellPadding, watermarkW, watermarkH);
            ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = '#E2E8F0'; // slate-200
        ctx.fillRect(x + 30 * scale, y + IMAGE_AREA_HEIGHT - 1, CELL_WIDTH - 60 * scale, 1.5 * scale);

        ctx.fillStyle = palette.textPrimary;
        ctx.font = `500 ${32 * scale}px ${typography.bodyFont}`;
        ctx.textAlign = 'center';
        ctx.fillText(images[index].label, x + CELL_WIDTH / 2, y + IMAGE_AREA_HEIGHT + (LABEL_AREA_HEIGHT / 2) + 10 * scale);
        onProgress?.(30 + (70 * (index + 1)) / contentImages.length);
    });

    // 5. Footer
    ctx.fillStyle = palette.textSecondary;
    ctx.font = `italic ${30 * scale}px ${typography.bodyFont}`;
    ctx.textAlign = 'center';
    ctx.fillText(brandInfo.footerText, canvas.width / 2, canvas.height - 60 * scale);
    
    onProgress?.(100);
    return canvas.toDataURL('image/png', 0.95);
};

/**
 * Creates a branded album and triggers a download of the PNG file.
 */
export const downloadBrandedAlbum = async (
    images: ImageItem[],
    options: AlbumOptions,
    resolution: number
) => {
    // Note: To provide user feedback, you might want to show a loading indicator here
    const collageDataUrl = await createBrandedAlbum(images, options, resolution);
    const link = document.createElement('a');
    link.href = collageDataUrl;
    const safeName = options.brandInfo.name.replace(/\s/g, '_') || "product";
    link.download = `album_${safeName}_${Date.now()}_${resolution}p.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
