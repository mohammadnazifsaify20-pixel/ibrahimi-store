'use client';

import React, { useState, useRef } from 'react';

interface ProductImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProductImportModal({ isOpen, onClose, onSuccess }: ProductImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    if (!isOpen) return null;

    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch(`${API_URL}/products/template`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'product_template.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed', error);
            alert('Failed to download template');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/products/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            setResult(data);
            if (res.ok && data.errors?.length === 0) {
                setTimeout(() => {
                    onSuccess();
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error('Upload failed', error);
            setResult({ message: 'Upload failed', errors: [{ message: 'Network error or server down' }] });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative border border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

                <h2 className="text-xl font-bold mb-4">Import Products</h2>

                {!result ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            <h3 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Step 1: Get the Template</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Download the CSV template to ensure your data is formatted correctly.</p>
                            <button
                                onClick={handleDownloadTemplate}
                                className="px-4 py-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition shadow-sm font-medium flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                Download CSV Template
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Step 2: Upload File</h3>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-indigo-600 file:text-white
                                hover:file:bg-indigo-700"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {uploading ? 'Uploading...' : 'Import Products'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg flex items-center gap-3 ${result.errors?.length > 0 ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-green-50 text-green-800 border-green-200'} border`}>
                            {result.errors?.length > 0 ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                    <div>
                                        <p className="font-bold">Import Completed with Issues</p>
                                        <p className="text-sm">Successfully imported: {result.successCount}. Failed: {result.errors.length}.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    <div>
                                        <p className="font-bold">Import Successful!</p>
                                        <p className="text-sm">All {result.successCount} products imported.</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {result.errors?.length > 0 && (
                            <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Row / SKU</th>
                                            <th className="px-4 py-2">Error</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.errors.map((err: any, idx: number) => (
                                            <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-mono">{err.row ? `Row ${err.row}` : err.sku}</td>
                                                <td className="px-4 py-2 text-red-600">{err.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => { setFile(null); setResult(null); onClose(); onSuccess(); }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                            >
                                Close
                            </button>
                            {result.errors?.length > 0 && (
                                <button
                                    onClick={() => { setFile(null); setResult(null); }}
                                    className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                                >
                                    Try Again
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
