'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/contexts/AuthContext';

interface ExportButtonProps {
  surveyId: string;
  format: 'csv' | 'json';
}

export function ExportButton({ surveyId, format }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { getToken } = useAuth();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      console.log(`📤 Exporting survey ${surveyId} as ${format.toUpperCase()}`);

      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(`/api/surveys/${surveyId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          console.warn('🚨 Authentication failed, redirecting to login');
          window.location.href = '/auth/login';
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to export as ${format.toUpperCase()}`);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `survey-${surveyId}-data.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);

      console.log(`✅ Successfully exported as ${format.toUpperCase()}: ${filename}`);

    } catch (error) {
      console.error(`❌ Export failed:`, error);
      alert(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getIcon = () => {
    if (format === 'csv') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const getButtonText = () => {
    if (isExporting) {
      return `Exporting ${format.toUpperCase()}...`;
    }
    return `Export ${format.toUpperCase()}`;
  };

  const getButtonVariant = () => {
    return format === 'csv' ? 'default' : 'outline';
  };

  return (
    <Button
      variant={getButtonVariant()}
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2"
    >
      {isExporting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      ) : (
        getIcon()
      )}
      {getButtonText()}
    </Button>
  );
} 