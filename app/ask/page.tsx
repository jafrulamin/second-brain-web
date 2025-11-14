/**
 * Ask page - Question answering interface
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Source {
  documentId: number;
  filename: string;
  chunkIndex: number;
}

interface QueryResponse {
  answer: string;
  sources: Source[];
  used: {
    k: number;
    model: string;
  };
}

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <Link
          href="/"
          style={{
            color: '#0070f3',
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '20px',
            display: 'inline-block',
          }}
        >
          ← Back to Home
        </Link>
        <h1 style={{ marginTop: '20px', marginBottom: '10px' }}>Ask Your Second Brain</h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Ask questions about your uploaded documents. Answers are generated using local AI.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to know about your documents?"
          disabled={loading}
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            marginTop: '12px',
            padding: '12px 24px',
            backgroundColor: loading ? '#999' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '500',
          }}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            color: '#721c24',
            marginBottom: '20px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div>
          <div
            style={{
              padding: '20px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              marginBottom: '20px',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
          >
            <h2 style={{ marginTop: '0', marginBottom: '12px', fontSize: '18px' }}>Answer</h2>
            <p style={{ margin: 0 }}>{response.answer}</p>
          </div>

          {response.sources.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Sources</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {response.sources.map((source, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      backgroundColor: '#e7f3ff',
                      border: '1px solid #b3d7ff',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    <strong>{source.filename}</strong> (chunk #{source.chunkIndex})
                  </div>
                ))}
              </div>
              <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                Used {response.used.k} chunks with model: {response.used.model}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

