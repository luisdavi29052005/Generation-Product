

export interface BatchCallbackPayload {
  successes: string[]; // data URLs base64, ex: data:image/png;base64,....
  failures: string[]; // mensagens de erro legíveis
}

export interface ImageItem {
  id: string;
  src: string;
  label: string;
}

export interface Palette {
  primary: string;
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
}

export interface Typography {
  titleFont: string;
  bodyFont: string;
}

export interface BrandInfo {
  name: string;
  slogan: string;
  logoSrc: string | null;
  footerText: string;
}

export interface AlbumOptions {
  brandInfo: BrandInfo;
  palette: Palette;
  typography: Typography;
  showWatermark: boolean;
  watermarkOpacity: number;
  imageAspectRatio: 'auto' | '1:1' | '4:3' | '3:4';
  imageFit: 'contain' | 'cover';
}
