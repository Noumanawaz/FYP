import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
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
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="space-y-3">
        {/* Upload Button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={uploading || (multiple && currentImages.length >= maxImages)}
          className={`w-full px-4 py-3 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center gap-2 ${
            uploading || (multiple && currentImages.length >= maxImages)
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed text-gray-400'
              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700'
          }`}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>
                {multiple
                  ? `Upload Images (${currentImages.length}/${maxImages})`
                  : currentImages.length > 0
                  ? 'Change Image'
                  : 'Upload Image'}
              </span>
            </>
          )}
        </button>

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
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {/* Image Preview */}
        {currentImages.length > 0 && (
          <div className={`grid gap-3 ${multiple ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
            {currentImages.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Helper Text */}
        {!multiple && currentImages.length === 0 && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <ImageIcon className="w-3 h-3" />
            Click to upload an image (max 32MB)
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;

