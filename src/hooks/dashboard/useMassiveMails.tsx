import { ScalarClient } from "@/types/client";
import { useEffect, useRef, useState } from "react";

interface AttachmentFile {
    name: string;
    size: number;
    id: string;
    file: File;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface SendCustomEmailResponse {
    to: string;
    subject: string;
    attachmentCount: number;
}

interface ClientData {
    id: string;
    email: string;
    fullName: string;
}

interface IndividualRecipient {
    id: string;
    name: string;
    email: string;
}

function useMassiveMails() {
    const [sendAllClients, setSendAllClients] = useState<boolean>(false);
    const [allUsers, setAllUsers] = useState<ClientData[]>([]);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [individualRecipients, setIndividualRecipients] = useState<IndividualRecipient[]>([]);
    const [tempRecipient, setTempRecipient] = useState({ name: "", email: "" });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAllClients, setShowAllClients] = useState(false);
    const [excludedClientIds, setExcludedClientIds] = useState<string[]>([]);
    
    // Nuevos estados para el modo comunicado
    const [isAnnouncementMode, setIsAnnouncementMode] = useState<boolean>(false);
    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementMessage, setAnnouncementMessage] = useState("");
    const [senderName, setSenderName] = useState("CreditoYa");
    const [bannerImage, setBannerImage] = useState<File | null>(null);
    const [additionalMessages, setAdditionalMessages] = useState<{ title: string; content: string }[]>([]);
    const [tempAdditionalMessage, setTempAdditionalMessage] = useState({ title: "", content: "" });
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!sendAllClients) return;

        const getAllUsers = async () => {
            try {
                let allClients: ScalarClient[] = [];
                let currentPage = 1;
                let hasMorePages = true;
                const pageSize = 100; // Usar un pageSize más grande para reducir peticiones

                while (hasMorePages) {
                    const response = await fetch(`/api/dash/clients?page=${currentPage}&pageSize=${pageSize}`, { 
                        method: 'GET' 
                    });
                    
                    if (!response.ok) {
                        throw new Error('Error fetching users');
                    }
                    
                    const result = await response.json();
                    const pageData = result.data?.users || [];
                    
                    // Agregar los clientes de esta página al array total
                    allClients = [...allClients, ...pageData];
                    
                    // Verificar si hay más páginas
                    // Asumiendo que la API devuelve información de paginación
                    const totalPages = result.data?.totalPages;
                    const totalCount = result.data?.totalCount;
                    const currentCount = result.data?.count;
                    
                    // Si hay información de paginación, usarla
                    if (totalPages) {
                        hasMorePages = currentPage < totalPages;
                    } else if (totalCount) {
                        hasMorePages = allClients.length < totalCount;
                    } else {
                        // Si no hay información de paginación, verificar si la página actual tiene datos
                        // Si la página devuelve menos elementos que el pageSize, asumimos que es la última
                        hasMorePages = pageData.length === pageSize;
                    }
                    
                    currentPage++;
                    
                    // Prevenir bucle infinito en caso de error en la lógica
                    if (currentPage > 1000) {
                        console.warn('Se alcanzó el límite máximo de páginas (1000). Deteniendo la carga.');
                        break;
                    }
                }

                // Transformar datos para guardar solo lo necesario
                const clientsData: ClientData[] = allClients.map(client => ({
                    id: client.id || '',
                    email: client.email,
                    fullName: `${client.names} ${client.firstLastName} ${client.secondLastName}`.trim()
                }));

                console.log(`Se cargaron ${clientsData.length} clientes en total`);
                setAllUsers(clientsData);
            } catch (error) {
                console.error('Failed to fetch users:', error);
                setAllUsers([]);
            }
        }

        getAllUsers();
    }, [sendAllClients]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Determinar lista de destinatarios
            let recipients: { email: string; name: string }[] = [];

            // Agregar clientes si está activo
            if (sendAllClients) {
                recipients = allUsers
                    .filter(user => !excludedClientIds.includes(user.id))
                    .map(user => ({
                        email: user.email,
                        name: user.fullName
                    }));
            }

            // Agregar destinatarios individuales
            const individualList = individualRecipients.map(recipient => ({
                email: recipient.email,
                name: recipient.name
            }));

            recipients = [...recipients, ...individualList];

            if (recipients.length === 0) {
                alert('No hay destinatarios para enviar el correo');
                setIsLoading(false);
                return;
            }

            console.log(`Enviando correos a ${recipients.length} destinatarios...`, recipients);

            // Enviar correo a cada destinatario
            const results = [];
            for (const recipient of recipients) {
                try {
                    // Crear FormData para cada destinatario
                    const formData = new FormData();

                    if (isAnnouncementMode) {
                        // Usar endpoint de comunicado
                        formData.append('email', recipient.email);
                        formData.append('subject', subject);
                        formData.append('title', announcementTitle);
                        formData.append('message', announcementMessage);
                        formData.append('recipientName', recipient.name);
                        formData.append('priority', "normal");
                        
                        if (senderName) {
                            formData.append('senderName', "CreditoYa");
                        }
                        
                        if (additionalMessages.length > 0) {
                            formData.append('additionalMessages', JSON.stringify(additionalMessages));
                        }
                        
                        if (bannerImage) {
                            formData.append('bannerImage', bannerImage);
                        }

                        const response = await fetch('/api/dash/clients/announce', {
                            method: 'POST',
                            body: formData,
                        });

                        const result: ApiResponse<any> = await response.json();
                        results.push({
                            email: recipient.email,
                            success: result.success,
                            error: result.error
                        });
                    } else {
                        // Usar endpoint normal
                        formData.append('email', recipient.email);
                        formData.append('subject', subject);
                        formData.append('message', message);
                        formData.append('recipientName', recipient.name);
                        formData.append('priority', "normal");

                        // Agregar archivos
                        attachments.forEach(attachment => {
                            formData.append('files', attachment.file);
                        });

                        const response = await fetch('/api/dash/clients/contact', {
                            method: 'POST',
                            body: formData,
                        });

                        const result: ApiResponse<SendCustomEmailResponse> = await response.json();
                        results.push({
                            email: recipient.email,
                            success: result.success,
                            error: result.error
                        });
                    }

                } catch (error) {
                    console.error(`Error sending email to ${recipient.email}:`, error);
                    results.push({
                        email: recipient.email,
                        success: false,
                        error: 'Error de conexión'
                    });
                }
            }

            // Mostrar resumen de resultados
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            if (successful > 0) {
                alert(`Correos enviados exitosamente: ${successful}/${recipients.length}`);

                // Limpiar formulario si todos fueron exitosos
                if (failed === 0) {
                    setSubject("");
                    setMessage("");
                    setAttachments([]);
                    setIndividualRecipients([]);
                    setTempRecipient({ name: "", email: "" });
                    
                    // Limpiar campos del modo comunicado
                    setAnnouncementTitle("");
                    setAnnouncementMessage("");
                    setSenderName("");
                    setBannerImage(null);
                    setAdditionalMessages([]);
                    setTempAdditionalMessage({ title: "", content: "" });

                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    
                    if (bannerInputRef.current) {
                        bannerInputRef.current.value = '';
                    }
                }
            }

            if (failed > 0) {
                const failedEmails = results.filter(r => !r.success).map(r => r.email);
                alert(`Error enviando correos a: ${failedEmails.join(', ')}`);
            }

        } catch (error) {
            console.error('Error sending emails:', error);
            alert('Error general al enviar correos. Por favor, inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    // También agregar una función para limpiar la lista de excluidos cuando se desactiva sendAllClients
    const switchClients = () => {
        setSendAllClients(!sendAllClients);
        if (sendAllClients) {
            // Si se está desactivando, limpiar la lista de excluidos
            setExcludedClientIds([]);
            setShowAllClients(false);
        }
    };

    const addIndividualRecipient = () => {
        if (!tempRecipient.name.trim() || !tempRecipient.email.trim()) {
            alert('Por favor, completa el nombre y email del destinatario');
            return;
        }

        // Validar email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(tempRecipient.email)) {
            alert('Por favor, ingresa un email válido');
            return;
        }

        // Verificar que no esté duplicado
        if (individualRecipients.some(r => r.email === tempRecipient.email)) {
            alert('Este email ya está agregado');
            return;
        }

        const newRecipient: IndividualRecipient = {
            id: Math.random().toString(36).substr(2, 9),
            name: tempRecipient.name.trim(),
            email: tempRecipient.email.trim()
        };

        setIndividualRecipients([...individualRecipients, newRecipient]);
        setTempRecipient({ name: "", email: "" });
    };

    const removeIndividualRecipient = (id: string) => {
        setIndividualRecipients(individualRecipients.filter(r => r.id !== id));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: AttachmentFile[] = Array.from(e.target.files).map(file => ({
                name: file.name,
                size: file.size,
                id: Math.random().toString(36).substr(2, 9),
                file: file
            }));
            setAttachments([...attachments, ...newFiles]);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(attachments.filter(file => file.id !== id));
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    };

    // Agregar esta función para remover clientes individuales
    const removeClientFromList = (clientId: string) => {
        setExcludedClientIds(prev => [...prev, clientId]);
    };

    // Funciones para el modo comunicado
    const toggleAnnouncementMode = () => {
        setIsAnnouncementMode(!isAnnouncementMode);
    };

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBannerImage(e.target.files[0]);
        }
    };

    const removeBannerImage = () => {
        setBannerImage(null);
        if (bannerInputRef.current) {
            bannerInputRef.current.value = '';
        }
    };

    const triggerBannerInput = () => {
        if (bannerInputRef.current) {
            bannerInputRef.current.click();
        }
    };

    const addAdditionalMessage = () => {
        if (!tempAdditionalMessage.title.trim() || !tempAdditionalMessage.content.trim()) {
            alert('Por favor, completa el título y contenido del mensaje adicional');
            return;
        }

        setAdditionalMessages([...additionalMessages, { ...tempAdditionalMessage }]);
        setTempAdditionalMessage({ title: "", content: "" });
    };

    const removeAdditionalMessage = (index: number) => {
        setAdditionalMessages(additionalMessages.filter((_, i) => i !== index));
    };

    return {
        allUsers,
        sendAllClients,
        subject,
        message,
        isLoading,
        attachments,
        fileInputRef,
        individualRecipients,
        tempRecipient,
        showAllClients,
        excludedClientIds,
        
        // Nuevos estados y funciones para modo comunicado
        isAnnouncementMode,
        announcementTitle,
        announcementMessage,
        senderName,
        bannerImage,
        additionalMessages,
        tempAdditionalMessage,
        bannerInputRef,
        
        // Funciones existentes
        setSubject,
        setMessage,
        setTempRecipient,
        handleSubmit,
        switchClients,
        addIndividualRecipient,
        removeIndividualRecipient,
        handleFileUpload,
        removeAttachment,
        triggerFileInput,
        formatFileSize,
        setShowAllClients,
        removeClientFromList,
        
        // Nuevas funciones para modo comunicado
        toggleAnnouncementMode,
        setAnnouncementTitle,
        setAnnouncementMessage,
        setSenderName,
        handleBannerUpload,
        removeBannerImage,
        triggerBannerInput,
        addAdditionalMessage,
        removeAdditionalMessage,
        setTempAdditionalMessage,
    }
}

export default useMassiveMails;