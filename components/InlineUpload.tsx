/**
 * Inline PDF upload component
 * Allows direct file upload from the home page without navigation
 * Supports multiple file selection and upload
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

interface UploadProgress {
  filename: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function InlineUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress([]);

    // Convert FileList to Array
    const fileArray = Array.from(files);

    // Initialize progress tracking
    const initialProgress: UploadProgress[] = fileArray.map(file => ({
      filename: file.name,
      status: 'uploading',
    }));
    setUploadProgress(initialProgress);

    // Upload all files in parallel
    const uploadPromises = fileArray.map(async (file, index) => {
      try {
        // Create FormData and append file
        const formData = new FormData();
        formData.append('file', file);

        // POST to upload API
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        // Update progress - success
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[index] = {
            filename: file.name,
            status: 'success',
          };
          return updated;
        });

        return { success: true, filename: file.name };
      } catch (err) {
        // Update progress - error
        setUploadProgress(prev => {
          const updated = [...prev];
          updated[index] = {
            filename: file.name,
            status: 'error',
            error: err instanceof Error ? err.message : 'Upload failed',
          };
          return updated;
        });

        return { success: false, filename: file.name };
      }
    });

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(false);

    // Refresh the page to show the new documents after a brief delay
    setTimeout(() => {
      setUploadProgress([]);
      router.refresh();
    }, 2000);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={uploading}
      />
      
      <button
        onClick={handleButtonClick}
        disabled={uploading}
        style={{
          padding: '12px 24px',
          backgroundColor: uploading ? '#999' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: '500',
        }}
      >
        {uploading ? 'Uploading...' : '+ Upload PDF'}
      </button>

      {/* Upload progress for multiple files */}
      {uploadProgress.length > 0 && (
        <div
          style={{
            marginTop: '15px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {uploadProgress.map((progress, index) => (
            <div
              key={index}
              style={{
                padding: '10px 14px',
                marginBottom: '8px',
                backgroundColor:
                  progress.status === 'success'
                    ? '#d4edda'
                    : progress.status === 'error'
                    ? '#f8d7da'
                    : '#e7f3ff',
                border: `1px solid ${
                  progress.status === 'success'
                    ? '#c3e6cb'
                    : progress.status === 'error'
                    ? '#f5c6cb'
                    : '#b3d7ff'
                }`,
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  color:
                    progress.status === 'success'
                      ? '#155724'
                      : progress.status === 'error'
                      ? '#721c24'
                      : '#004085',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginRight: '10px',
                }}
              >
                {progress.filename}
              </span>
              <span
                style={{
                  fontWeight: '500',
                  color:
                    progress.status === 'success'
                      ? '#155724'
                      : progress.status === 'error'
                      ? '#721c24'
                      : '#004085',
                }}
              >
                {progress.status === 'uploading' && '⏳ Uploading...'}
                {progress.status === 'success' && '✓ Done'}
                {progress.status === 'error' && `✗ ${progress.error || 'Failed'}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

