/**
 * Storage abstraction layer for handling PDF files
 * Supports both local filesystem and cloud storage (Vercel Blob)
 */

import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { cfg, isLocalStorage } from '@/lib/config';

/**
 * Result of saving a PDF file
 */
export interface SaveResult {
  url: string;
  sizeBytes: number;
}

/**
 * Ensures the upload directory exists, creating it if necessary
 */
async function ensureUploadDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Sanitizes a filename by:
 * - Converting to lowercase
 * - Replacing spaces and unsafe characters with hyphens
 * - Ensuring .pdf extension
 * - Removing consecutive hyphens
 */
function sanitizeFilename(originalName: string): string {
  // Remove extension temporarily
  const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
  
  // Sanitize: lowercase, replace unsafe chars with hyphens
  let safe = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')  // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-')          // Replace consecutive hyphens with single hyphen
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
  
  // Fallback if name becomes empty after sanitization
  if (!safe) {
    safe = 'document-' + Date.now();
  }
  
  // Always ensure .pdf extension
  return safe + '.pdf';
}

/**
 * Save a PDF file to storage (local or cloud)
 * @param buffer - PDF file buffer
 * @param filename - Original filename
 * @returns Object with URL/path and size
 */
export async function savePdf(buffer: Buffer, filename: string): Promise<SaveResult> {
  if (isLocalStorage()) {
    // Local filesystem storage
    const dirPath = cfg.UPLOAD_DIR;
    await ensureUploadDir(dirPath);
    
    const safeFilename = sanitizeFilename(filename);
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${safeFilename}`;
    const savedPath = join(dirPath, uniqueFilename);
    
    await writeFile(savedPath, buffer);
    
    return {
      url: savedPath,
      sizeBytes: buffer.length,
    };
  } else if (cfg.STORAGE_DRIVER === 'vercel-blob') {
    // Vercel Blob storage (placeholder implementation)
    if (!cfg.VERCEL_BLOB_READ_WRITE_TOKEN) {
      throw new Error('VERCEL_BLOB_READ_WRITE_TOKEN not configured');
    }
    
    // TODO: Implement Vercel Blob upload
    // For now, this is a placeholder that would use @vercel/blob package
    // Example implementation:
    // import { put } from '@vercel/blob';
    // const blob = await put(filename, buffer, {
    //   access: 'public',
    //   token: cfg.VERCEL_BLOB_READ_WRITE_TOKEN,
    // });
    // return { url: blob.url, sizeBytes: buffer.length };
    
    throw new Error('Vercel Blob storage not yet implemented. Set STORAGE_DRIVER=local or implement Vercel Blob integration.');
  } else {
    throw new Error(`Unknown storage driver: ${cfg.STORAGE_DRIVER}`);
  }
}

/**
 * Read a PDF file from storage (local or cloud)
 * @param pathOrUrl - File path (local) or URL (cloud)
 * @returns PDF file buffer
 */
export async function readPdf(pathOrUrl: string): Promise<Buffer> {
  if (isLocalStorage()) {
    // Local filesystem read
    const absolutePath = resolveFilePath(pathOrUrl);
    return await readFile(absolutePath);
  } else if (cfg.STORAGE_DRIVER === 'vercel-blob') {
    // Vercel Blob download (placeholder)
    // TODO: Implement Vercel Blob download
    // Example:
    // const response = await fetch(pathOrUrl);
    // const arrayBuffer = await response.arrayBuffer();
    // return Buffer.from(arrayBuffer);
    
    throw new Error('Vercel Blob storage not yet implemented');
  } else {
    throw new Error(`Unknown storage driver: ${cfg.STORAGE_DRIVER}`);
  }
}

/**
 * Delete a PDF file from storage (local or cloud)
 * @param pathOrUrl - File path (local) or URL (cloud)
 */
export async function deletePdf(pathOrUrl: string): Promise<void> {
  if (isLocalStorage()) {
    // Local filesystem delete
    const absolutePath = resolveFilePath(pathOrUrl);
    await unlink(absolutePath);
  } else if (cfg.STORAGE_DRIVER === 'vercel-blob') {
    // Vercel Blob delete (placeholder)
    // TODO: Implement Vercel Blob delete
    // Example:
    // import { del } from '@vercel/blob';
    // await del(pathOrUrl, { token: cfg.VERCEL_BLOB_READ_WRITE_TOKEN });
    
    throw new Error('Vercel Blob storage not yet implemented');
  } else {
    throw new Error(`Unknown storage driver: ${cfg.STORAGE_DRIVER}`);
  }
}

/**
 * Resolve a file path to absolute path from project root
 * @param filePath - Relative or absolute file path
 * @returns Absolute path
 */
export function resolveFilePath(filePath: string): string {
  return resolve(process.cwd(), filePath);
}

/**
 * Legacy function for backward compatibility
 * Saves a PDF file to disk with sanitized filename
 */
export async function savePdfToDisk(
  file: File,
  dirPath: string
): Promise<{ savedPath: string; safeFilename: string; sizeBytes: number }> {
  // Ensure directory exists
  await ensureUploadDir(dirPath);
  
  // Sanitize the filename
  const safeFilename = sanitizeFilename(file.name);
  
  // Create unique filename by prepending timestamp if file exists
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}-${safeFilename}`;
  const savedPath = join(dirPath, uniqueFilename);
  
  // Convert Web File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Write to disk
  await writeFile(savedPath, buffer);
  
  return {
    savedPath,
    safeFilename: uniqueFilename,
    sizeBytes: buffer.length,
  };
}
