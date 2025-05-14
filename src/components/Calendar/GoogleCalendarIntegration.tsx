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

    // Estados para o modal de seleção de eventos
    const [pendingImportEvents, setPendingImportEvents] = useState<Event[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedImportEvents, setSelectedImportEvents] = useState<{ [key: string]: boolean }>({});

    const googleLogin = useGoogleLogin({
        onSuccess: tokenResponse => {
            localStorage.setItem('google_access_token', tokenResponse.access_token);
            setIsAuthenticated(true);
            setStatusMessage("Autenticado com sucesso!");
            setStatusType('success');
        },
        scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
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
        const token = localStorage.getItem('google_access_token');

        const eventsToExport = events.slice(0, 10);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const event of eventsToExport) {
                try {
                    const startDate = new Date(event.date);
                    const endDate = event.endDate
                        ? new Date(event.endDate)
                        : new Date(startDate.getTime() + 60 * 60 * 1000);

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

                    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(googleEvent)
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(`Erro na API: ${result.error?.message || JSON.stringify(result)}`);
                    }

                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (eventError) {
                    console.error(`Erro ao exportar evento "${event.title}":`, eventError);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                setStatusMessage(`${successCount} eventos exportados com sucesso! ${errorCount > 0 ? `(${errorCount} falhas)` : ''}`);
                setStatusType('success');
            } else {
                setStatusMessage("Falha ao exportar eventos. Verifique o console para detalhes.");
                setStatusType('error');
            }

        } catch (error) {
            console.error('Erro ao sincronizar com Google Calendar:', error);
            setStatusMessage("Erro ao comunicar com o Google Calendar.");
            setStatusType('error');
        } finally {
            setIsSyncing(false);
        }
    };

    const importFromGoogleCalendar = async () => {
        if (!isAuthenticated) {
            googleLogin();
            return;
        }

        setIsSyncing(true);
        setStatusMessage("Buscando eventos...");
        setStatusType('info');
        const token = localStorage.getItem('google_access_token');

        try {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);

            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate.toISOString()
                }&timeMax=${endDate.toISOString()
                }&maxResults=50&singleEvents=true&orderBy=startTime`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na API: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                setStatusMessage("Nenhum evento encontrado no calendário.");
                setStatusType('info');
                setIsSyncing(false);
                return;
            }

            // Convertendo eventos do Google Calendar para o formato do app
            const fetchedEvents: Event[] = data.items
                .filter((item: any) => item.status !== "cancelled")
                .map((item: any) => ({
                    title: item.summary || "Evento sem título",
                    description: item.description || '',
                    date: new Date(item.start.dateTime || item.start.date),
                    endDate: item.end ? new Date(item.end.dateTime || item.end.date) : undefined,
                    type: 'outro',
                    location: item.location || '',
                    googleId: item.id
                }));

            // Inicializar todos como selecionados
            const initialSelection: { [key: string]: boolean } = {};
            fetchedEvents.forEach((_, index) => {
                initialSelection[index] = true;
            });

            setPendingImportEvents(fetchedEvents);
            setSelectedImportEvents(initialSelection);
            setShowImportModal(true);
            setStatusMessage(`${fetchedEvents.length} eventos encontrados. Selecione quais deseja importar.`);
            setStatusType('info');

        } catch (error) {
            console.error('Erro ao buscar eventos:', error);
            setStatusMessage("Erro ao buscar eventos do Google Calendar.");
            setStatusType('error');
        } finally {
            setIsSyncing(false);
        }
    };

    // Nova função para confirmar a importação
    const confirmImport = () => {
        // Filtrando apenas eventos selecionados
        const eventsToImport = pendingImportEvents.filter((_, index) => selectedImportEvents[index]);

        if (eventsToImport.length === 0) {
            setStatusMessage("Nenhum evento selecionado para importação.");
            setStatusType('info');
            setShowImportModal(false);
            return;
        }

        // Passa os eventos selecionados para o callback de importação
        onImportEvents(eventsToImport);
        setStatusMessage(`${eventsToImport.length} eventos importados com sucesso!`);
        setStatusType('success');
        setShowImportModal(false);
        setPendingImportEvents([]);
    };

    // Função para alternar a seleção de um evento
    const toggleEventSelection = (index: number) => {
        setSelectedImportEvents(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Função para selecionar/desselecionar todos
    const toggleSelectAll = (select: boolean) => {
        const newSelection: { [key: string]: boolean } = {};
        pendingImportEvents.forEach((_, index) => {
            newSelection[index] = select;
        });
        setSelectedImportEvents(newSelection);
    };

    return (
        <div className="google-calendar-integration">
            <h4>Google Calendar</h4>

            {statusMessage && (
                <div className={`calendar-status-message ${statusType}`}>
                    {statusMessage}
                </div>
            )}

            <div className="calendar-test-users-note">
                Esta integração permite sincronizar eventos entre o aplicativo e o Google Calendar.
                {!isAuthenticated && " Clique em um dos botões abaixo para começar."}
            </div>

            <div className="google-calendar-buttons">
                <button
                    className="google-calendar-btn export"
                    onClick={exportToGoogleCalendar}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Exportar para Google Calendar' : 'Conectar e Exportar'}
                </button>
                <button
                    className="google-calendar-btn import"
                    onClick={importFromGoogleCalendar}
                    disabled={isSyncing}
                >
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Importar do Google Calendar' : 'Conectar e Importar'}
                </button>
            </div>

            {/* Modal de seleção de eventos para importação */}
            {showImportModal && (
                <div className="calendar-import-modal">
                    <h4>Selecione os eventos para importar</h4>

                    <div className="calendar-import-select-all">
                        <button
                            className="calendar-secondary-btn"
                            onClick={() => toggleSelectAll(true)}
                        >
                            Selecionar todos
                        </button>
                        <button
                            className="calendar-secondary-btn"
                            onClick={() => toggleSelectAll(false)}
                        >
                            Desmarcar todos
                        </button>
                    </div>

                    <div className="calendar-import-list">
                        {pendingImportEvents.map((event, index) => (
                            <div
                                key={index}
                                className={`calendar-import-item ${selectedImportEvents[index] ? 'selected' : ''}`}
                                onClick={() => toggleEventSelection(index)}
                            >
                                <div className="calendar-import-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedImportEvents[index] || false}
                                        onChange={() => toggleEventSelection(index)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="calendar-import-details">
                                    <div className="calendar-import-title">{event.title}</div>
                                    <div className="calendar-import-date">
                                        {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {event.location && (
                                        <div className="calendar-import-location">{event.location}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="calendar-import-counter">
                        {Object.values(selectedImportEvents).filter(Boolean).length} de {pendingImportEvents.length} eventos selecionados
                    </div>

                    <div className="calendar-import-actions">
                        <button
                            className="calendar-secondary-btn"
                            onClick={() => {
                                setShowImportModal(false);
                                setStatusMessage(null);
                            }}
                        >
                            Cancelar
                        </button>
                        <button
                            className="calendar-primary-btn"
                            onClick={confirmImport}
                            disabled={Object.values(selectedImportEvents).filter(Boolean).length === 0}
                        >
                            Importar eventos
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoogleCalendarIntegration;