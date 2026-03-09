'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'duplicate' | 'error';

interface UploadResult {
  status: string;
  message?: string;
  report_id?: string;
  report_date?: string;
  vessel_count?: number;
  error?: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
      setFile(f);
      setStatus('idle');
      setResult(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch('/api/ingest', { method: 'POST', body: formData });
      const data: UploadResult = await res.json();

      if (res.status === 201) {
        setStatus('success');
      } else if (res.status === 409) {
        setStatus('duplicate');
      } else {
        setStatus('error');
      }
      setResult(data);
    } catch (e: any) {
      setStatus('error');
      setResult({ status: 'error', error: e.message });
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload Lineup PDF</h1>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <p className="text-muted-foreground">
          {file ? file.name : 'Drop a PDF here or click to select'}
        </p>
        {file && (
          <p className="text-sm text-muted-foreground mt-1">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || status === 'uploading'}
        className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'uploading' ? 'Processing...' : 'Upload'}
      </button>

      {result && (
        <div className={`mt-4 rounded-md p-4 text-sm ${
          status === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200' :
          status === 'duplicate' ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200' :
          'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
        }`}>
          {status === 'success' && (
            <p>Imported {result.vessel_count} vessels from report dated {result.report_date?.slice(0, 10)}</p>
          )}
          {status === 'duplicate' && (
            <p>{result.message}</p>
          )}
          {status === 'error' && (
            <p>Error: {result.error}</p>
          )}
        </div>
      )}

      {status === 'success' && (
        <Link href="/admin/ingestion" className="block mt-4 text-sm text-primary hover:underline">
          View ingestion log →
        </Link>
      )}
    </div>
  );
}
