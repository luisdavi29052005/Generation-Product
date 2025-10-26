import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  }, [onImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return (
    <label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`group relative mt-4 flex justify-center items-center w-full max-w-lg mx-auto h-64 px-6 pt-5 pb-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
        ${isDragging ? 'border-blue-500 bg-slate-800 scale-105' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
    >
      <div className="space-y-2 text-center">
        <UploadIcon className="mx-auto h-12 w-12 text-slate-500 group-hover:text-slate-400 transition-colors" />
        <div className="flex text-md text-slate-400 group-hover:text-slate-300">
            <span className="font-semibold text-blue-400">Clique para enviar</span>&nbsp;ou arraste e solte
        </div>
        <p className="text-xs text-slate-500">PNG, JPG, WEBP (máx. 10MB)</p>
      </div>
      <input
        id="file-upload"
        name="file-upload"
        type="file"
        className="sr-only"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />
    </label>
  );
};

export default ImageUploader;