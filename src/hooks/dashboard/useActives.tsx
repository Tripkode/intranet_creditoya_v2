"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { debounce } from "lodash";
import { IoReloadOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { companiesUser, ScalarClient } from "@/types/client";
import { ScalarLoanApplication } from "@/types/loan";
import { ScalarDocument } from "@/types/documents";

export interface LoanData {
    user: ScalarClient;
    document: ScalarDocument;
    loanApplication: ScalarLoanApplication;
}

interface ApiResponse {
    success: boolean;
    data: LoanData[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

function useActives() {
    // Estado "real" usado para la consulta en el servidor
    const [searchTerm, setSearchTerm] = useState('');
    // Estado visual del input
    const [inputValue, setInputValue] = useState('');

    const router = useRouter()

    const [activeTab, setActiveTab] = useState<'aprobados' | 'aplazados' | 'cambio'>('aprobados');
    const [isLoading, setIsLoading] = useState(true);
    const [loanData, setLoanData] = useState<LoanData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1
    });
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

    // Función debounced para actualizar el searchTerm
    const debouncedSetSearchTerm = useCallback(
        debounce((value: string) => {
            setSearchTerm(value);
        }, 500),
        []
    );

    // Función para hacer fetch a la API (ya se aplica filtrado en el endpoint)
    const fetchData = useCallback(async (page = 1, search = '') => {
        setIsLoading(true);
        setError(null);

        try {
            let statusParam = "";
            switch (activeTab) {
                case 'aprobados':
                    statusParam = "Aprobado";
                    break;
                case 'aplazados':
                    statusParam = "Aplazado";
                    break;
                case 'cambio':
                    statusParam = "New-cantity";
                    break;
                default:
                    statusParam = "Aprobado";
            }

            const params = new URLSearchParams({
                status: statusParam,
                page: page.toString(),
                pageSize: pagination.pageSize.toString()
            });

            if (search) {
                params.append('search', search);
            }

            console.log(`Fetching data with params: ${params.toString()}`);
            const response = await axios.get<ApiResponse>(`/api/dash/status?${params.toString()}`, { withCredentials: true });

            if (response.data.success && Array.isArray(response.data.data)) {
                const responseData = response.data.data;
                console.log("response: ", responseData);
                setLoanData(responseData);

                setPagination({
                    currentPage: response.data.page || page,
                    pageSize: response.data.pageSize || pagination.pageSize,
                    totalItems: response.data.total || 0,
                    totalPages: response.data.totalPages || 1
                });

                setLastUpdated(new Date());
            } else {
                console.warn("No data returned or invalid format:", response.data);
                setLoanData([]);
                setPagination(prev => ({ ...prev, totalItems: 0, totalPages: 1 }));
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Error al cargar los datos. Por favor, intente de nuevo más tarde.");
            setLoanData([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, pagination.pageSize]);

    // Actualizar el searchTerm con debouncing cuando cambia el valor del input
    useEffect(() => {
        debouncedSetSearchTerm(inputValue);
    }, [inputValue, debouncedSetSearchTerm]);

    // Buscar en el servidor cuando el searchTerm cambia
    useEffect(() => {
        // Solo se hace fetch si el searchTerm está vacío o tiene más de 3 caracteres
        if (searchTerm === '' || searchTerm.length > 3) {
            fetchData(1, searchTerm);
        }
    }, [searchTerm, fetchData]);

    // Manejo del cambio de pestaña: se reinician los estados de búsqueda
    useEffect(() => {
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        setInputValue('');
        setSearchTerm('');
        fetchData(1);
    }, [activeTab, fetchData]);

    // Configurar intervalo para actualizar el tiempo
    useEffect(() => {
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        const interval = setInterval(() => {
            setLastUpdated(prev => new Date(prev.getTime()));
        }, 60000);

        setUpdateInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    // Manejo del input de búsqueda
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    // Limpiar búsqueda
    const clearSearch = () => {
        setInputValue('');
        setSearchTerm('');
        fetchData(1);
    };

    // Manejo de paginación
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
            fetchData(newPage, searchTerm);
        }
    };

    // Formatear fecha
    const formatDate = (dateString: string) => {
        if (!dateString) return "Fecha no disponible";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return "Formato de fecha inválido";
        }
    };

    // Formatear moneda
    const formatCurrency = (value: string) => {
        if (!value) return "$0";
        try {
            const amount = parseFloat(value);
            return new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        } catch (e) {
            return "Valor inválido";
        }
    };

    // Formatear tiempo transcurrido desde la última actualización
    const getTimeSinceUpdate = () => {
        const now = new Date();
        const diffMs = now.getTime() - lastUpdated.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Actualizado hace unos segundos";
        if (diffMins === 1) return "Actualizado hace 1 minuto";
        return `Actualizado hace ${diffMins} minutos`;
    };

    // Manejar recarga manual
    const handleManualRefresh = () => {
        fetchData(pagination.currentPage, searchTerm);
    };

    // Componente de indicador de actualización
    const UpdateIndicator = () => (
        <div className="grid place-content-center">
            <div className="flex flex-row gap-3">
                <p className="text-xs font-thin">{getTimeSinceUpdate()}</p>
                <div
                    className="grid place-content-center cursor-pointer hover:text-green-500 transition-colors"
                    onClick={handleManualRefresh}
                >
                    <IoReloadOutline className={`${isLoading ? 'animate-spin text-green-500' : 'text-gray-500'}`} />
                </div>
            </div>
        </div>
    );

    // Función para generar números de página para paginación
    const getPageNumbers = () => {
        const totalPages = pagination.totalPages;
        const currentPage = pagination.currentPage;
        const maxPageNumbers = 5;
        const pageNumbers = [];

        if (totalPages <= maxPageNumbers) {
            // Mostrar todos los números de página si el total es menor que maxPageNumbers
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // Incluir siempre primera página, última página, página actual y
            // una o dos páginas a cada lado de la página actual

            let startPage = Math.max(2, currentPage - 1);
            let endPage = Math.min(totalPages - 1, currentPage + 1);

            // Ajustar si currentPage está cerca del principio
            if (currentPage <= 2) {
                endPage = Math.min(totalPages - 1, 4);
            }

            // Ajustar si currentPage está cerca del final
            if (currentPage >= totalPages - 1) {
                startPage = Math.max(2, totalPages - 3);
            }

            // Incluir siempre la página 1
            pageNumbers.push(1);

            // Añadir elipsis si es necesario
            if (startPage > 2) {
                pageNumbers.push('...');
            }

            // Añadir páginas intermedias
            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
            }

            // Añadir elipsis si es necesario
            if (endPage < totalPages - 1) {
                pageNumbers.push('...');
            }

            // Incluir siempre la última página
            pageNumbers.push(totalPages);
        }

        return pageNumbers;
    };


    return {
        activeTab,
        searchQuery: inputValue,
        isLoading,
        loanData,
        error,
        pagination,
        fetchData,
        handleSearchChange,
        clearSearch,
        handlePageChange,
        formatDate,
        formatCurrency,
        setActiveTab,
        getTimeSinceUpdate,
        handleManualRefresh,
        UpdateIndicator,
        getPageNumbers,
        router,
    };
}

export default useActives;
