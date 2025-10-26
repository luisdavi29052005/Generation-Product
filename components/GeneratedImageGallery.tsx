import React, { useState } from 'react';
import { DownloadIcon, ImageIcon } from './icons';
import type { ImageItem } from '../types';

interface GeneratedImageGalleryProps {
  images: ImageItem[];
  onReorder: (reorderedImages: ImageItem[]) => void;
  isLoading: boolean;
  totalToGenerate: number;
}

const ImageCard: React.FC<{ 
    image: ImageItem; 
    index: number;
    onDragStart: (index: number) => void;
    onDragEnter: (index: number) => void;
    onDragEnd: () => void;
    isDragging: boolean;
}> = ({ image, index, onDragStart, onDragEnter, onDragEnd, isDragging }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.src;
    link.download = `product_shot_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const opacity = isDragging ? 'opacity-50' : 'opacity-100';

  return (
    <div 
      draggable 
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`group relative aspect-square bg-slate-800 rounded-xl overflow-hidden ring-1 ring-slate-700/50 transition-all hover:ring-blue-500 hover:scale-[1.03] cursor-grab active:cursor-grabbing ${opacity}`}
    >
      <img src={image.src} alt="Generated product shot" className="w-full h-full object-cover pointer-events-none" />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
         <button onClick={handleDownload} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 backdrop-blur-sm transition-colors" aria-label="Download Image">
            <DownloadIcon className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
}

const PlaceholderCard: React.FC = () => (
    <div className="aspect-square bg-slate-800 rounded-xl animate-pulse"></div>
);

const GeneratedImageGallery: React.FC<GeneratedImageGalleryProps> = ({ images, onReorder, isLoading, totalToGenerate }) => {
  const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
  
  const handleDragStart = (index: number) => {
    setDragItemIndex(index);
  };
  
  const handleDragEnter = (index: number) => {
    if (dragItemIndex === null || dragItemIndex === index) return;
    
    const newImages = [...images];
    const dragItem = newImages.splice(dragItemIndex, 1)[0];
    newImages.splice(index, 0, dragItem);
    
    setDragItemIndex(index);
    onReorder(newImages);
  };

  const handleDragEnd = () => {
    setDragItemIndex(null);
  };

  if (!isLoading && images.length === 0) {
    return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-xl p-4 text-center">
            <ImageIcon className="w-16 h-16 text-slate-600 mb-4" />
            <h4 className="text-lg font-semibold text-slate-300">Awaiting Generation</h4>
            <p className="text-slate-400 max-w-xs">Your AI-generated product shots will appear here.</p>
        </div>
    );
  }

  const placeholdersCount = isLoading && images.length === 0 ? totalToGenerate : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {images.map((img, index) => (
        <ImageCard 
            key={img.id}
            image={img}
            index={index}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
            isDragging={dragItemIndex === index}
        />
      ))}
      {Array.from({ length: placeholdersCount }).map((_, index) => (
        <PlaceholderCard key={`placeholder-${index}`} />
      ))}
    </div>
  );
};

export default GeneratedImageGallery;
