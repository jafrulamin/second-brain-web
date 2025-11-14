/**
 * /upload page - PDF upload form
 * Client component for uploading PDFs to the server
 * 
 * a
 */

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<{
    filename: string;
    documentId: number;
    sizeBytes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

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

      // Show success
      setSuccess({
        filename: data.filename,
        documentId: data.documentId,
        sizeBytes: data.sizeBytes,
      });
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ marginBottom: '30px' }}>Upload PDF Document</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="file-input" style={{ display: 'block', marginBottom: '10px' }}>
            Select PDF file (max 20MB):
          </label>
          <input
            id="file-input"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
            style={{
              display: 'block',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              width: '100%',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!file || uploading}
          style={{
            padding: '12px 24px',
            backgroundColor: uploading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload PDF'}
        </button>
      </form>

      {/* Success message */}
      {success && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>
            ✓ Upload Successful!
          </h3>
          <p style={{ margin: '5px 0' }}>
            <strong>Document ID:</strong> {success.documentId}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Filename:</strong> {success.filename}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Size:</strong> {formatBytes(success.sizeBytes)}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>
            ✗ Error
          </h3>
          <p style={{ margin: 0, color: '#721c24' }}>{error}</p>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <Link
          href="/"
          style={{
            color: '#0070f3',
            textDecoration: 'none',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

