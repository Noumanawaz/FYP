import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '../../services/api';

interface ImageUploadProps {
  value?: string | string[];
  onChange: (url: string | string[]) => void;
  multiple?: boolean;
  maxImages?: number;
  label?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  multiple = false,
  maxImages = 10,
  label,
  className = '',
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImages = multiple
    ? (Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [])
    : value && typeof value === 'string'
    ? [value]
    : [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      if (multiple) {
        const filesArray = Array.from(files).slice(0, maxImages - currentImages.length);
        const formData = new FormData();
        filesArray.forEach((file) => {
          formData.append('images', file);
        });

        const response = await apiService.uploadImages(formData);
        if (response.success && response.data?.urls) {
          const newUrls = [...currentImages, ...response.data.urls];
          onChange(newUrls);
        } else {
          throw new Error(response.error || 'Failed to upload images');
        }
      } else {
        const file = files[0];
        const formData = new FormData();
        formData.append('image', file);

        const response = await apiService.uploadImage(formData);
        if (response.success && response.data?.url) {
          onChange(response.data.url);
        } else {
          throw new Error(response.error || 'Failed to upload image');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image(s)');
      console.error('Image upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    if (multiple) {
      const newImages = currentImages.filter((_, i) => i !== index);
      onChange(newImages);
    } else {
      onChange('');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-1">
          {label}
        </label>
      )}

      <div className="space-y-4">
        {/* Image Preview Grid */}
        {currentImages.length > 0 && (
          <div className={`grid gap-4 ${multiple ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {currentImages.map((url, index) => (
              <div key={index} className="relative group rounded-3xl overflow-hidden border border-gray-100 dark:border-white/10 shadow-sm bg-gray-50 dark:bg-white/[0.02]">
                <div className={`${multiple ? 'aspect-square' : 'aspect-video max-h-[300px]'} overflow-hidden`}>
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                
                {/* Overlay with Change Image capability */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleClick}
                    className="px-4 py-2 bg-white text-gray-900 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500 hover:text-white transition-all shadow-xl"
                  >
                    Change Image
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-xl"
                    aria-label="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Trigger Zone - only show if not single image or if multiple and not reached max */}
        {(!(!multiple && currentImages.length > 0)) && (currentImages.length < maxImages) && (
          <div 
            onClick={handleClick}
            className={`
              relative group flex flex-col items-center justify-center gap-4 py-12 px-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer
              ${uploading 
                ? 'border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] cursor-not-allowed' 
                : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] hover:border-cyan-500/50 hover:bg-cyan-500/[0.03] hover:shadow-2xl hover:shadow-cyan-500/10'
              }
            `}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Processing Assets...</span>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-500 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white block">
                    {multiple ? 'Import Multiple Assets' : 'Upload Identity Asset'}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-500 font-medium uppercase tracking-widest mt-1 block">
                    {multiple ? `Max ${maxImages} Files` : 'PNG, JPG, WEBP • Max 10MB'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl uppercase tracking-widest"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;

