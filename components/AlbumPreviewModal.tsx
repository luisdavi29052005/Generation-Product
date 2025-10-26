
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { DownloadIcon, CloseIcon, UploadIcon } from './icons';
import { createBrandedAlbum, downloadBrandedAlbum, computePalette, createDefaultPalette } from '../services/zipService';
import type { ImageItem, AlbumOptions, Palette } from '../types';

// Helper component for a single input field in the branding panel
const ControlInput: React.FC<{label: string; id: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void;}> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
        <input id={id} {...props} className="w-full bg-slate-700 text-white rounded-md border border-slate-600 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
    </div>
);

// Helper component for color input
const ControlColor: React.FC<{label: string; id: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void;}> = ({ label, id, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
        <div className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-md pr-2">
            <input type="color" id={id} {...props} className="w-8 h-8 p-1 bg-transparent border-none cursor-pointer" />
            <span className="text-sm text-slate-400 font-mono">{props.value}</span>
        </div>
    </div>
);

// Branding Controls Panel Component, defined in-file to adhere to constraints
const BrandingControls: React.FC<{ options: AlbumOptions; onOptionsChange: (newOptions: AlbumOptions) => void; }> = ({ options, onOptionsChange }) => {
    
    const handleBrandInfoChange = (field: string, value: string) => {
        onOptionsChange({ ...options, brandInfo: { ...options.brandInfo, [field]: value } });
    };

    const handlePaletteChange = (field: keyof Palette, value: string) => {
        onOptionsChange({ ...options, palette: { ...options.palette, [field]: value } });
    };

    const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const logoSrc = reader.result as string;
                const newPalette = await computePalette(logoSrc);
                onOptionsChange({ 
                    ...options, 
                    brandInfo: { ...options.brandInfo, logoSrc },
                    palette: newPalette,
                });
            };
            reader.readAsDataURL(file);
        }
    };
    
    return (
        <div className="w-full lg:w-96 bg-slate-800/50 border-l border-slate-700 p-4 sm:p-6 space-y-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white">Customize Branding</h3>
            
            {/* Logo Section */}
            <div className="space-y-3">
                <h4 className="font-semibold text-slate-300">Logo & Palette</h4>
                <label className="relative flex justify-center items-center w-full h-24 px-4 border-2 border-dashed rounded-lg cursor-pointer bg-slate-700/50 border-slate-600 hover:border-blue-500 transition-colors">
                    {options.brandInfo.logoSrc ? (
                        <img src={options.brandInfo.logoSrc} alt="Brand Logo" className="max-h-20 object-contain"/>
                    ) : (
                        <div className="text-center text-slate-400">
                           <UploadIcon className="w-6 h-6 mx-auto mb-1"/>
                           <p className="text-sm">Upload Logo</p>
                        </div>
                    )}
                    <input type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleLogoUpload}/>
                </label>
                <ControlColor label="Primary Color" id="primaryColor" value={options.palette.primary} onChange={(e) => handlePaletteChange('primary', e.target.value)} />
                 <button onClick={() => onOptionsChange({ ...options, palette: createDefaultPalette() })} className="w-full text-xs text-center text-slate-400 hover:text-white transition-colors">Reset Colors</button>
            </div>

             {/* Text Section */}
            <div className="space-y-4">
                <h4 className="font-semibold text-slate-300">Text Content</h4>
                <ControlInput label="Brand Name / Title" id="brandName" value={options.brandInfo.name} onChange={(e) => handleBrandInfoChange('name', e.target.value)} />
                <ControlInput label="Slogan / Subtitle" id="slogan" value={options.brandInfo.slogan} onChange={(e) => handleBrandInfoChange('slogan', e.target.value)} />
                <ControlInput label="Footer Text" id="footerText" value={options.brandInfo.footerText} onChange={(e) => handleBrandInfoChange('footerText', e.target.value)} />
            </div>
            
            {/* Layout Section */}
            <div className="space-y-4">
                <h4 className="font-semibold text-slate-300">Layout & Style</h4>
                 <div>
                    <label htmlFor="imageFit" className="block text-sm font-medium text-slate-300 mb-1.5">Image Fit</label>
                    <div className="flex w-full bg-slate-700 rounded-lg p-1">
                        <button onClick={() => onOptionsChange({...options, imageFit: 'contain'})} className={`w-1/2 py-1.5 text-sm rounded-md transition-colors ${options.imageFit === 'contain' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-600'}`}>Contain</button>
                        <button onClick={() => onOptionsChange({...options, imageFit: 'cover'})} className={`w-1/2 py-1.5 text-sm rounded-md transition-colors ${options.imageFit === 'cover' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-600'}`}>Cover</button>
                    </div>
                 </div>
                 <div>
                    <label htmlFor="aspectRatio" className="block text-sm font-medium text-slate-300 mb-1.5">Image Aspect Ratio</label>
                    <select
                        id="aspectRatio"
                        value={options.imageAspectRatio}
                        onChange={(e) => onOptionsChange({ ...options, imageAspectRatio: e.target.value as AlbumOptions['imageAspectRatio'] })}
                        className="w-full bg-slate-700 text-white rounded-md border border-slate-600 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                        disabled={options.imageFit === 'contain'}
                    >
                        <option value="auto">Auto</option>
                        <option value="1:1">Square (1:1)</option>
                        <option value="4:3">Landscape (4:3)</option>
                        <option value="3:4">Portrait (3:4)</option>
                    </select>
                 </div>
                 <div className="flex items-center justify-between bg-slate-700/80 p-3 rounded-lg">
                    <label htmlFor="showWatermark" className="text-sm font-medium text-slate-300">Logo watermark on images</label>
                    <button
                        id="showWatermark"
                        role="switch"
                        aria-checked={options.showWatermark}
                        onClick={() => onOptionsChange({ ...options, showWatermark: !options.showWatermark })}
                        className={`${options.showWatermark ? 'bg-blue-600' : 'bg-slate-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                    >
                        <span className={`${options.showWatermark ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                    </button>
                </div>
            </div>

        </div>
    );
};


interface AlbumPreviewModalProps {
  images: ImageItem[];
  initialOptions: AlbumOptions;
  onOptionsChange: (newOptions: AlbumOptions) => void;
  onClose: () => void;
}

const AlbumPreviewModal: React.FC<AlbumPreviewModalProps> = ({ images, initialOptions, onOptionsChange, onClose }) => {
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [isRendering, setIsRendering] = useState(true);
  const [renderProgress, setRenderProgress] = useState(0);

  const renderPreview = useCallback(async (opts: AlbumOptions) => {
      setIsRendering(true);
      setRenderProgress(0);
      try {
          // Render a faster, lower-resolution preview for the UI
          const dataUrl = await createBrandedAlbum(images, opts, 1024, setRenderProgress);
          setPreviewSrc(dataUrl);
      } catch (error) {
          console.error("Failed to render album preview:", error);
          setPreviewSrc(''); // Clear preview on error
      } finally {
          setIsRendering(false);
      }
  }, [images]);

  useEffect(() => {
    // Initial render and subsequent re-renders on options change
    renderPreview(initialOptions);
  }, [initialOptions, renderPreview]);
  
  const handleDownload = async (resolution: number) => {
    // Add a loading state for downloads
    await downloadBrandedAlbum(images, initialOptions, resolution);
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-editor-title"
    >
      <style>{`@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }`}</style>
      
      <div 
        className="bg-slate-800 rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col lg:flex-row" 
        onClick={e => e.stopPropagation()}
      >
        {/* Main Content: Preview */}
        <div className="flex-grow flex flex-col overflow-hidden">
            <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                <h3 id="album-editor-title" className="text-lg font-semibold text-white">Album Editor & Exporter</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDownload(1080)} className="flex items-center justify-center gap-2 bg-slate-600 text-slate-200 font-semibold py-2 px-4 rounded-lg hover:bg-slate-500 text-sm transition-colors">
                        <DownloadIcon className="w-4 h-4" /><span>Export 1080p</span>
                    </button>
                    <button onClick={() => handleDownload(2048)} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-500 text-sm transition-colors">
                        <DownloadIcon className="w-4 h-4" /><span>Export 2048p</span>
                    </button>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700 ml-2" aria-label="Close editor">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
            </header>
            <div className="p-4 sm:p-6 flex-grow overflow-auto bg-slate-900 flex items-center justify-center">
                {isRendering && <div className="text-center text-slate-300">Rendering preview... ({renderProgress}%)</div>}
                {!isRendering && previewSrc && <img src={previewSrc} alt="Album preview" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />}
                {!isRendering && !previewSrc && <div className="text-center text-red-400">Failed to render preview.</div>}
            </div>
        </div>

        {/* Side Panel: Controls */}
        <BrandingControls options={initialOptions} onOptionsChange={onOptionsChange} />
      </div>
    </div>
  );
};

export default AlbumPreviewModal;
