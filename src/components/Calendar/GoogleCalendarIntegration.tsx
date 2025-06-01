import React, { useState, useContext } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { ThemeContext } from '../../contexts/ThemeContext';

interface Event {
    id?: string;
    title: string;
    date: Date;
    endDate?: Date;
    description: string;
    type: 'visita' | 'reuniao' | 'outro';
    location?: string;
    googleId?: string;
}

interface GoogleCalendarIntegrationProps {
    events: Event[];
    onImportEvents: (events: Event[]) => void;
}

const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({ events, onImportEvents }) => {
    const { colors } = useContext(ThemeContext);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');

    const [pendingImportEvents, setPendingImportEvents] = useState<Event[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedImportEvents, setSelectedImportEvents] = useState<{ [key: string]: boolean }>({});

    const googleLogin = useGoogleLogin({
        onSuccess: tokenResponse => {
            sessionStorage.setItem('google_access_token', tokenResponse.access_token); // 🔒 mais seguro
            setIsAuthenticated(true);
            setStatusMessage("Autenticado com sucesso!");
            setStatusType('success');
        },
        scope: 'https://www.googleapis.com/auth/calendar.events',
        flow: 'implicit',
        onError: (error) => {
            console.error('Login falhou:', error);
            setStatusMessage("Erro na autenticação. Por favor, tente novamente.");
            setStatusType('error');
        }
    });

    const exportToGoogleCalendar = async () => {
        if (!isAuthenticated) {
            googleLogin();
            return;
        }

        setIsSyncing(true);
        setStatusMessage("Exportando eventos...");
        setStatusType('info');
        const token = sessionStorage.getItem('google_access_token');

        const eventsToExport = events.slice(0, 10);
        let successCount = 0;
        let errorCount = 0;

        for (const event of eventsToExport) {
            try {
                const startDate = new Date(event.date);
                const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

                const googleEvent = {
                    summary: event.title,
                    description: event.description || '',
                    start: {
                        dateTime: startDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    },
                    location: event.location || '',
                    transparency: 'opaque',
                    status: 'confirmed'
                };
                const linkExport = import.meta.env.VITE_FIREBASE_EXPORT_API;
                if (!linkExport) {
                    throw new Error("VITE_FIREBASE_EXPORT_API environment variable is not set");
                }
                const response = await fetch(linkExport, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: token, event: googleEvent })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message);
                }

                successCount++;
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (eventError) {
                console.error(`Erro ao exportar "${event.title}":`, eventError);
                errorCount++;
            }
        }

        setStatusMessage(`${successCount} exportado(s) com sucesso. ${errorCount > 0 ? `${errorCount} erro(s)` : ''}`);
        setStatusType(successCount > 0 ? 'success' : 'error');
        setIsSyncing(false);
    };

    const importFromGoogleCalendar = async () => {
        if (!isAuthenticated) {
            googleLogin();
            return;
        }

        setIsSyncing(true);
        setStatusMessage("Buscando eventos...");
        setStatusType('info');
        const token = sessionStorage.getItem('google_access_token');

        try {
            const linkImport = import.meta.env.VITE_FIREBASE_IMPORT_API;
            if (!linkImport) {
                throw new Error("VITE_FIREBASE_IMPORT_API environment variable is not set");
            }
            const response = await fetch(linkImport, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: token })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            const data = await response.json();
            const fetchedEvents: Event[] = data.items.map((item: any) => ({
                title: item.summary || "Evento sem título",
                description: item.description || '',
                date: new Date(item.start.dateTime || item.start.date),
                endDate: item.end ? new Date(item.end.dateTime || item.end.date) : undefined,
                type: 'outro',
                location: item.location || '',
                googleId: item.id
            }));

            const initialSelection: { [key: string]: boolean } = {};
            fetchedEvents.forEach((_, index) => initialSelection[index] = true);

            setPendingImportEvents(fetchedEvents);
            setSelectedImportEvents(initialSelection);
            setShowImportModal(true);
            setStatusMessage(`${fetchedEvents.length} eventos encontrados.`);
            setStatusType('info');

        } catch (error) {
            console.error('Erro ao importar:', error);
            setStatusMessage("Erro ao importar eventos.");
            setStatusType('error');
        } finally {
            setIsSyncing(false);
        }
    };

    const confirmImport = () => {
        const eventsToImport = pendingImportEvents.filter((_, index) => selectedImportEvents[index]);
        if (eventsToImport.length === 0) {
            setStatusMessage("Nenhum evento selecionado.");
            setStatusType('info');
            setShowImportModal(false);
            return;
        }

        onImportEvents(eventsToImport);
        setStatusMessage(`${eventsToImport.length} importado(s) com sucesso.`);
        setStatusType('success');
        setShowImportModal(false);
        setPendingImportEvents([]);
    };

    const toggleEventSelection = (index: number) => {
        setSelectedImportEvents(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const toggleSelectAll = (select: boolean) => {
        const newSelection: { [key: string]: boolean } = {};
        pendingImportEvents.forEach((_, index) => newSelection[index] = select);
        setSelectedImportEvents(newSelection);
    };

    return (
        <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            margin: '1rem 0'
        }}>
            <style>
                {`
                .google-calendar-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                @media (min-width: 640px) {
                    .google-calendar-buttons {
                        flex-direction: row;
                    }
                }
                `}
            </style>
            <h4 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: colors.text,
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center'
            }}>
                <svg style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', color: colors.primary }} viewBox="0 0 24 24" fill="none">
                    <path fill="currentColor" d="M21.5 6c.276 0 .5.224.5.5v14c0 .276-.224.5-.5.5h-19c-.276 0-.5-.224-.5-.5v-14c0-.276.224-.5.5-.5h19zm0-1h-19c-.828 0-1.5.672-1.5 1.5v14c0 .828.672 1.5 1.5 1.5h19c.828 0 1.5-.672 1.5-1.5v-14c0-.828-.672-1.5-1.5-1.5z" />
                    <path fill="#EA4335" d="M6.5 15h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                    <path fill="#FBBC05" d="M12.5 15h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                    <path fill="#4285F4" d="M18.5 15h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                    <path fill="#34A853" d="M12.5 11h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                </svg>
                Google Calendar
            </h4>

            {statusMessage && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    marginBottom: '0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: statusType === 'success' ? colors.success + '20' :
                        statusType === 'error' ? colors.error + '20' :
                            colors.primary + '20',
                    color: statusType === 'success' ? colors.success :
                        statusType === 'error' ? colors.error :
                            colors.primary,
                    borderLeft: `4px solid ${statusType === 'success' ? colors.success :
                        statusType === 'error' ? colors.error :
                            colors.primary}`
                }}>
                    <div style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}>
                        {statusType === 'success' && '✅'}
                        {statusType === 'error' && '❌'}
                        {statusType === 'info' && 'ℹ️'}
                    </div>
                    {statusMessage}
                </div>
            )}

            <div style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{ fontSize: '1.125rem' }}>ℹ️</span>
                <div>
                    Esta integração permite sincronizar eventos com o Google Calendar.
                    {!isAuthenticated && " Clique para conectar."}
                </div>
            </div>

            <div className="google-calendar-buttons">
                <button
                    onClick={exportToGoogleCalendar}
                    disabled={isSyncing}
                    style={{
                        flex: '1',
                        minWidth: '200px',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: isSyncing ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        backgroundColor: colors.primary,
                        color: 'white',
                        opacity: isSyncing ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => !isSyncing && (e.currentTarget.style.backgroundColor = colors.primary + 'dd')}
                    onMouseLeave={(e) => !isSyncing && (e.currentTarget.style.backgroundColor = colors.primary)}
                >
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Exportar' : 'Conectar e Exportar'}
                </button>
                <button
                    onClick={importFromGoogleCalendar}
                    disabled={isSyncing}
                    style={{
                        flex: '1',
                        minWidth: '200px',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: isSyncing ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        backgroundColor: colors.accent,
                        color: colors.text,
                        opacity: isSyncing ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => !isSyncing && (e.currentTarget.style.backgroundColor = colors.accent + 'dd')}
                    onMouseLeave={(e) => !isSyncing && (e.currentTarget.style.backgroundColor = colors.accent)}
                >
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Importar' : 'Conectar e Importar'}
                </button>
            </div>

            {showImportModal && (
                <div style={{
                    backgroundColor: colors.surface,
                    borderRadius: '0.5rem',
                    border: `1px solid ${colors.border}`,
                    padding: '1.25rem',
                    marginTop: '1.25rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}>
                    <h4 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: '1rem'
                    }}>
                        Selecione os eventos
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <button
                            onClick={() => toggleSelectAll(true)}
                            style={{
                                flex: '1',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.875rem',
                                backgroundColor: colors.surface,
                                color: colors.textSecondary,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                transition: 'colors 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface + 'dd';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface;
                            }}
                        >
                            Selecionar todos
                        </button>
                        <button
                            onClick={() => toggleSelectAll(false)}
                            style={{
                                flex: '1',
                                padding: '0.5rem 0.75rem',
                                fontSize: '0.875rem',
                                backgroundColor: colors.surface,
                                color: colors.textSecondary,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                transition: 'colors 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface + 'dd';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface;
                            }}
                        >
                            Desmarcar todos
                        </button>
                    </div>
                    <div style={{
                        maxHeight: '20rem',
                        overflowY: 'auto',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '0.25rem',
                        marginBottom: '1rem',
                        backgroundColor: colors.background
                    }}>
                        {pendingImportEvents.map((event, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    padding: '0.75rem',
                                    borderBottom: index < pendingImportEvents.length - 1 ? `1px solid ${colors.border}` : 'none',
                                    cursor: 'pointer',
                                    transition: 'colors 0.2s',
                                    backgroundColor: selectedImportEvents[index] ? colors.primary + '20' : 'transparent'
                                }}
                                onClick={() => toggleEventSelection(index)}
                                onMouseEnter={(e) => {
                                    if (!selectedImportEvents[index]) {
                                        e.currentTarget.style.backgroundColor = colors.surface;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!selectedImportEvents[index]) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginRight: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedImportEvents[index] || false}
                                        onChange={() => toggleEventSelection(index)}
                                        style={{
                                            width: '1.25rem',
                                            height: '1.25rem',
                                            cursor: 'pointer',
                                            accentColor: colors.primary
                                        }}
                                    />
                                </div>
                                <div style={{ flex: '1' }}>
                                    <div style={{
                                        fontWeight: '500',
                                        color: colors.text,
                                        marginBottom: '0.25rem'
                                    }}>
                                        {event.title}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: colors.textSecondary,
                                        marginBottom: '0.25rem'
                                    }}>
                                        {new Date(event.date).toLocaleString()}
                                    </div>
                                    {event.location && (
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: colors.textSecondary
                                        }}>
                                            📍 {event.location}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        textAlign: 'center',
                        marginBottom: '1rem',
                        fontSize: '0.875rem',
                        color: colors.textSecondary
                    }}>
                        {Object.values(selectedImportEvents).filter(Boolean).length} de {pendingImportEvents.length} selecionado(s)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button
                            onClick={() => setShowImportModal(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: colors.surface,
                                color: colors.textSecondary,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                transition: 'colors 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface + 'dd';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface;
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmImport}
                            disabled={Object.values(selectedImportEvents).filter(Boolean).length === 0}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: colors.primary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: Object.values(selectedImportEvents).filter(Boolean).length === 0 ? 'not-allowed' : 'pointer',
                                transition: 'colors 0.2s',
                                opacity: Object.values(selectedImportEvents).filter(Boolean).length === 0 ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (Object.values(selectedImportEvents).filter(Boolean).length > 0) {
                                    e.currentTarget.style.backgroundColor = colors.primary + 'dd';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (Object.values(selectedImportEvents).filter(Boolean).length > 0) {
                                    e.currentTarget.style.backgroundColor = colors.primary;
                                }
                            }}
                        >
                            Importar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoogleCalendarIntegration;