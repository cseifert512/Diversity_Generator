'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, Image, FileImage } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  maxFiles?: number;
  compact?: boolean;
}

export function DropZone({ 
  onFilesSelected, 
  isUploading = false,
  maxFiles = 30,
  compact = false
}: DropZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles,
    disabled: isUploading,
  });

  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-drafted-lg p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-coral-400 bg-coral-50' : 'border-drafted-border hover:border-drafted-gray'}
          ${isDragReject ? 'border-coral-500 bg-coral-50' : ''}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-3">
          <div className={`
            w-12 h-12 rounded-drafted flex items-center justify-center transition-colors
            ${isDragActive ? 'bg-coral-100' : 'bg-drafted-bg'}
          `}>
            {isDragActive ? (
              <FileImage className="w-6 h-6 text-coral-500" />
            ) : (
              <Upload className="w-6 h-6 text-drafted-gray" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-drafted-black">
              {isDragActive ? 'Drop here' : 'Drag & drop files'}
            </p>
            <p className="mt-1 text-xs text-drafted-gray">
              PNG, JPG up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-drafted-xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-coral-400 bg-coral-50' : 'border-drafted-border hover:border-drafted-gray bg-white'}
          ${isDragReject ? 'border-coral-500 bg-coral-50' : ''}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-drafted-lg flex items-center justify-center transition-colors
            ${isDragActive ? 'bg-coral-100' : 'bg-drafted-bg'}
          `}>
            {isDragActive ? (
              <FileImage className="w-8 h-8 text-coral-500" />
            ) : (
              <Upload className="w-8 h-8 text-drafted-gray" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-semibold text-drafted-black">
              {isDragActive 
                ? 'Drop your floor plans here' 
                : 'Drag & drop floor plans'}
            </p>
            <p className="mt-1 text-sm text-drafted-gray">
              or click to browse • PNG, JPG up to {maxFiles} files
            </p>
          </div>

          {!isDragActive && (
            <button 
              type="button" 
              className="btn-drafted-secondary mt-2"
              disabled={isUploading}
            >
              <Image className="w-4 h-4 mr-2" />
              Select Images
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
