/**
 * Client component for triggering document embedding
 */

'use client';

import { useState, memo } from 'react';

interface EmbedButtonProps {
  documentId: number;
  filename: string;
}

function EmbedButton({ documentId, filename }: EmbedButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    chunksCreated: number;
    embeddingsCreated: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmbed = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show the server's error message directly
        throw new Error(data.error || 'Embedding failed');
      }

      setResult({
        chunksCreated: data.chunksCreated,
        embeddingsCreated: data.embeddingsCreated,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <button
        onClick={handleEmbed}
        disabled={loading || result !== null}
        style={{
          padding: '6px 12px',
          backgroundColor: result
            ? '#28a745'
            : loading
            ? '#6c757d'
            : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || result ? 'not-allowed' : 'pointer',
          fontSize: '14px',
        }}
      >
        {loading ? 'Embedding...' : result ? '✓ Embedded' : 'Embed'}
      </button>

      {result && (
        <span
          style={{
            marginLeft: '10px',
            fontSize: '12px',
            color: '#28a745',
            fontWeight: '500',
          }}
        >
          Done ✓ ({result.chunksCreated} chunks)
        </span>
      )}

      {error && (
        <div
          style={{
            marginTop: '5px',
            padding: '8px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            fontSize: '12px',
          }}
        >
          Error: {error}
        </div>
      )}
    </div>
  );
}

export default memo(EmbedButton);

