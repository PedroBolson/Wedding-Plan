import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import './Calendar.css';

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
        <div className="google-calendar-integration">
            <h4>Google Calendar</h4>
            {statusMessage && <div className={`calendar-status-message ${statusType}`}>{statusMessage}</div>}
            <div className="calendar-test-users-note">
                Esta integração permite sincronizar eventos com o Google Calendar.
                {!isAuthenticated && " Clique para conectar."}
            </div>
            <div className="google-calendar-buttons">
                <button className="google-calendar-btn export" onClick={exportToGoogleCalendar} disabled={isSyncing}>
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Exportar' : 'Conectar e Exportar'}
                </button>
                <button className="google-calendar-btn import" onClick={importFromGoogleCalendar} disabled={isSyncing}>
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Importar' : 'Conectar e Importar'}
                </button>
            </div>

            {showImportModal && (
                <div className="calendar-import-modal">
                    <h4>Selecione os eventos</h4>
                    <div className="calendar-import-select-all">
                        <button onClick={() => toggleSelectAll(true)}>Selecionar todos</button>
                        <button onClick={() => toggleSelectAll(false)}>Desmarcar todos</button>
                    </div>
                    <div className="calendar-import-list">
                        {pendingImportEvents.map((event, index) => (
                            <div key={index} className={`calendar-import-item ${selectedImportEvents[index] ? 'selected' : ''}`} onClick={() => toggleEventSelection(index)}>
                                <input type="checkbox" checked={selectedImportEvents[index] || false} onChange={() => toggleEventSelection(index)} />
                                <div>
                                    <strong>{event.title}</strong><br />
                                    {new Date(event.date).toLocaleString()}
                                    {event.location && <div>{event.location}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div>{Object.values(selectedImportEvents).filter(Boolean).length} de {pendingImportEvents.length} selecionado(s)</div>
                    <div>
                        <button onClick={() => setShowImportModal(false)}>Cancelar</button>
                        <button onClick={confirmImport} disabled={Object.values(selectedImportEvents).filter(Boolean).length === 0}>Importar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoogleCalendarIntegration;