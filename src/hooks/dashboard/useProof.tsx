"use client"

import { useState, useEffect } from 'react';
import axios from 'axios';
import { ScalarLoanApplication, Status } from '@/types/loan';
import { ScalarClient } from '@/types/client';

interface GeneratedDocument {
  id: string;
  loanId: string;
  uploadId: string;
  publicUrl: string;
  documentTypes: string[];
  created_at: string;
  updated_at: string;
  downloadCount: number;
  lastDownloaded?: string;
}

interface DocumentParams {
  documentType: string;
  signature: string;
  numberDocument: string;
  name?: string;
  autoDownload?: boolean;
}

interface DocumentWithLoan {
  document: GeneratedDocument;
  loanApplication: {
    id: string;
    status: Status;
    amount: number;
    created_at: string;
    user: ScalarClient;
  };
  downloadCount: number;
  lastDownloaded?: string;
}

function useProof() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvedLoans, setApprovedLoans] = useState<ScalarLoanApplication[]>([]);
  const [postponedLoans, setPostponedLoans] = useState<ScalarLoanApplication[]>([]);
  const [pendingDocumentsLoans, setPendingDocumentsLoans] = useState<any>({ count: 0, loans: [] });
  const [selectedStatus, setSelectedStatus] = useState<Status>('Aprobado');
  const [generatingDocuments, setGeneratingDocuments] = useState(false);
  const [allDocuments, setAllDocuments] = useState<DocumentWithLoan[]>([]);
  const [downloadedDocuments, setDownloadedDocuments] = useState<DocumentWithLoan[]>([]);
  const [neverDownloadedDocuments, setNeverDownloadedDocuments] = useState<DocumentWithLoan[]>([]);
  const [batchGenerationStatus, setBatchGenerationStatus] = useState<{
    inProgress: boolean;
    results: any | null;
  }>({
    inProgress: false,
    results: null
  });
  const [expandedResults, setExpandedResults] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]); // IDs de documentos seleccionados
  const [currentPage, setCurrentPage] = useState(1); // Página actual
  const itemsPerPage = 10; // Número de elementos por página

  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleToggleDownload = async () => {
    setIsDownloaded(true); // Update state to indicate download in progress

    try {
      // Use the allDocuments array to download each document
      for (const doc of allDocuments) {
        await downloadDocumentById(doc.document.id);
      }

      // Refresh the document lists after downloads
      await fetchAllDocuments();
      await fetchDownloadedDocuments();
      await fetchNeverDownloadedDocuments();

      // Reset download state when complete
      setIsDownloaded(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al descargar los documentos');
      }
      setIsDownloaded(false);
    }
  };

  useEffect(() => {
    fetchLoans(selectedStatus);
  }, [selectedStatus]);

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchAllDocuments();
      await fetchDownloadedDocuments();
      await fetchNeverDownloadedDocuments();
    };

    loadInitialData();
  }, []);

  // Cargar los préstamos pendientes al montar el componente
  useEffect(() => {
    fetchPendingDocumentsLoans();
  }, []);

  const fetchLoans = async (status: Status) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/dash/pdfs/loans-with-documents?status=${status}`,
        { withCredentials: true }
      );

      if (status === 'Aprobado') {
        setApprovedLoans(response.data.data);
      } else if (status === 'Aplazado') {
        setPostponedLoans(response.data.data);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al obtener préstamos');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDocumentsLoans = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/dash/pdfs/pending-documents', { withCredentials: true });
      setPendingDocumentsLoans(response.data.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al obtener documentos pendientes');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanDocuments = async (loanId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/dash/pdfs/loan-documents?loanId=${loanId}`,
        { withCredentials: true }
      );
      return response.data.data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al obtener documentos del préstamo');
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  const generateDocuments = async (
    documentsParams: DocumentParams[],
    userId: string,
    loanId: string
  ) => {
    try {
      setGeneratingDocuments(true);
      const response = await axios.post('/api/dash/pdfs/generate', {
        documentsParams,
        userId,
        loanId
      }, { withCredentials: true });

      await fetchLoans(selectedStatus);
      await fetchAllDocuments(); // Refresh document lists after generation

      return response.data.data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al generar documentos');
      }
      return null;
    } finally {
      setGeneratingDocuments(false);
    }
  };

  const generateAllPendingDocuments = async () => {
    try {
      setBatchGenerationStatus({
        inProgress: true,
        results: null
      });

      const response = await axios.post('/api/dash/pdfs/generate-all-pending', {}, { withCredentials: true });

      await fetchPendingDocumentsLoans();
      await fetchLoans(selectedStatus);
      await fetchAllDocuments(); // Refresh document lists after generation

      setBatchGenerationStatus({
        inProgress: false,
        results: response.data
      });

      return response.data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al generar documentos pendientes');
      }
      setBatchGenerationStatus({
        inProgress: false,
        results: null
      });
      return null;
    }
  };

  // New methods for the new API endpoints
  const fetchAllDocuments = async (userId?: string, loanId?: string) => {
    try {
      setLoading(true);
      let url = '/api/dash/pdfs/all-documents';

      // Add query parameters if provided
      if (userId || loanId) {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (loanId) params.append('loanId', loanId);
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, { withCredentials: true });
      console.log(response)
      setAllDocuments(response.data.data);
      return response.data.data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al obtener todos los documentos');
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchNeverDownloadedDocuments = async (userId?: string, loanId?: string) => {
    try {
      setLoading(true);
      let url = '/api/dash/pdfs/never-downloaded';

      // Add query parameters if provided
      if (userId || loanId) {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (loanId) params.append('loanId', loanId);
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, { withCredentials: true });
      setNeverDownloadedDocuments(response.data.data);
      return response.data.data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al obtener documentos no descargados');
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadedDocuments = async (userId?: string, loanId?: string) => {
    try {
      setLoading(true);
      let url = '/api/dash/pdfs/downloaded';

      // Add query parameters if provided
      if (userId || loanId) {
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (loanId) params.append('loanId', loanId);
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, { withCredentials: true });
      setDownloadedDocuments(response.data.data);
      return response.data.data;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al obtener documentos descargados');
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  const downloadDocumentById = async (documentId: string) => {
    try {
      // Crear una solicitud con axios y configurar responseType: 'blob'
      const response = await axios.get(`/api/dash/pdfs/document?document_id=${documentId}`, {
        withCredentials: true,
        responseType: 'blob'
      });

      if (!response.data) {
        throw new Error(`Error en la descarga: ${response.status}`);
      }

      // Obtener el blob de la respuesta
      const blob = response.data;

      // Crear un objeto URL para el blob
      const url = window.URL.createObjectURL(blob);

      // Crear un elemento <a> para descargar el archivo
      const a = document.createElement('a');
      a.href = url;

      // Obtener el nombre del archivo desde los headers si está disponible
      const contentDisposition = response.headers['content-disposition'];
      const fileName = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `document_${documentId}.pdf`;

      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Refresh document lists after download
      await fetchAllDocuments();
      await fetchDownloadedDocuments();
      await fetchNeverDownloadedDocuments();

      return true;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Error al descargar documento');
      }
      return false;
    }
  };

  const toggleStatus = (status: Status) => {
    setSelectedStatus(status);
  };

  const downloadDocument = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'loan-documents.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFullName = (user: ScalarClient) => {
    return `${user.names} ${user.firstLastName} ${user.secondLastName || ''}`.trim();
  };

  // Filtrar documentos con downloadCount === 0
  const eligibleDocuments = allDocuments.filter((doc) => doc.downloadCount === 0);

  const handleRefresh = () => {
    fetchPendingDocumentsLoans();
  };

  const handleGenerateAll = async () => {
    await generateAllPendingDocuments();
  };

  // Manejo de la selección/deselección de documentos
  const toggleDocumentSelection = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      setSelectedDocuments(selectedDocuments.filter((id) => id !== documentId));
    } else {
      setSelectedDocuments([...selectedDocuments, documentId]);
    }
  };

  // Descargar todos los documentos seleccionados
  const handleDownloadSelected = async () => {
    for (const documentId of selectedDocuments) {
      await downloadDocumentById(documentId);
    }
    setSelectedDocuments([]); // Limpiar selección después de la descarga
  };

  // Paginación: Calcular los documentos a mostrar en la página actual
  const paginatedDocuments = eligibleDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Cambiar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    loading,
    error,
    approvedLoans,
    postponedLoans,
    pendingDocumentsLoans,
    selectedStatus,
    generatingDocuments,
    batchGenerationStatus,
    allDocuments,
    downloadedDocuments,
    neverDownloadedDocuments,
    eligibleDocuments,
    selectedDocuments,
    currentPage,
    itemsPerPage,
    paginatedDocuments,
    expandedResults,
    isDownloaded,
    handleToggleDownload,
    setExpandedResults,
    toggleStatus,
    fetchPendingDocumentsLoans,
    fetchLoanDocuments,
    generateDocuments,
    downloadDocument,
    formatDate,
    getFullName,
    generateAllPendingDocuments,
    fetchAllDocuments,
    fetchDownloadedDocuments,
    fetchNeverDownloadedDocuments,
    downloadDocumentById,
    handleRefresh,
    handleGenerateAll,
    toggleDocumentSelection,
    handleDownloadSelected,
    handlePageChange,
  };
}

export default useProof;