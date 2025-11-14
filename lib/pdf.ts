/**
 * PDF parsing utilities
 * Wrapper around pdf-parse v1 with proper Next.js compatibility
 */

import { readFile } from 'fs/promises';

/**
 * Extract text from a PDF file
 * @param filePath - Absolute path to the PDF file
 * @returns Object with extracted text and page count
 */
export async function extractTextFromPdf(filePath: string): Promise<{ text: string; pages: number }> {
  try {
    const dataBuffer = await readFile(filePath);
    
    // pdf-parse v1 has a simple default export
    const pdfParse = (await import('pdf-parse')).default;
    
    const data = await pdfParse(dataBuffer);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PDF] Extracted ${data.text.length} chars from ${data.numpages} pages`);
    }
    
    return {
      text: data.text,
      pages: data.numpages,
    };
  } catch (error: any) {
    console.error('[PDF] Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

