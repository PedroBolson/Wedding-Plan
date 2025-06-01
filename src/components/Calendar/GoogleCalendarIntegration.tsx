import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

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
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 my-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none">
                    <path fill="currentColor" d="M21.5 6c.276 0 .5.224.5.5v14c0 .276-.224.5-.5.5h-19c-.276 0-.5-.224-.5-.5v-14c0-.276.224-.5.5-.5h19zm0-1h-19c-.828 0-1.5.672-1.5 1.5v14c0 .828.672 1.5 1.5 1.5h19c.828 0 1.5-.672 1.5-1.5v-14c0-.828-.672-1.5-1.5-1.5z" />
                    <path fill="#EA4335" d="M6.5 15h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                    <path fill="#FBBC05" d="M12.5 15h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                    <path fill="#4285F4" d="M18.5 15h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                    <path fill="#34A853" d="M12.5 11h-2c-.276 0-.5.224-.5.5s.224.5.5.5h2c.276 0 .5-.224.5-.5s-.224-.5-.5-.5z" />
                </svg>
                Google Calendar
            </h4>

            {statusMessage && (
                <div className={`flex items-center p-3 mb-3 rounded-lg text-sm ${statusType === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-l-4 border-green-400' :
                        statusType === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-l-4 border-red-400' :
                            'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-4 border-blue-400'
                    }`}>
                    <div className="w-4 h-4 mr-2">
                        {statusType === 'success' && '✅'}
                        {statusType === 'error' && '❌'}
                        {statusType === 'info' && 'ℹ️'}
                    </div>
                    {statusMessage}
                </div>
            )}

            <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                <div>
                    Esta integração permite sincronizar eventos com o Google Calendar.
                    {!isAuthenticated && " Clique para conectar."}
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={exportToGoogleCalendar}
                    disabled={isSyncing}
                    className="flex-1 min-w-[200px] px-4 py-3 rounded-lg border-none cursor-pointer font-medium transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Exportar' : 'Conectar e Exportar'}
                </button>
                <button
                    onClick={importFromGoogleCalendar}
                    disabled={isSyncing}
                    className="flex-1 min-w-[200px] px-4 py-3 rounded-lg border-none cursor-pointer font-medium transition-all duration-200 bg-yellow-500 text-gray-900 hover:bg-yellow-600 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSyncing ? 'Sincronizando...' : isAuthenticated ? 'Importar' : 'Conectar e Importar'}
                </button>
            </div>

            {showImportModal && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mt-5 shadow-lg">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Selecione os eventos
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                        <button
                            onClick={() => toggleSelectAll(true)}
                            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Selecionar todos
                        </button>
                        <button
                            onClick={() => toggleSelectAll(false)}
                            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Desmarcar todos
                        </button>
                    </div>
                    <div className="max-h-64 sm:max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded mb-4 bg-white dark:bg-gray-900">
                        {pendingImportEvents.map((event, index) => (
                            <div
                                key={index}
                                className={`flex p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 cursor-pointer transition-colors ${selectedImportEvents[index] ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                onClick={() => toggleEventSelection(index)}
                            >
                                <div className="flex items-center mr-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedImportEvents[index] || false}
                                        onChange={() => toggleEventSelection(index)}
                                        className="w-5 h-5 cursor-pointer text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                                        {event.title}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {new Date(event.date).toLocaleString()}
                                    </div>
                                    {event.location && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            📍 {event.location}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
                        {Object.values(selectedImportEvents).filter(Boolean).length} de {pendingImportEvents.length} selecionado(s)
                    </div>
                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            onClick={() => setShowImportModal(false)}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmImport}
                            disabled={Object.values(selectedImportEvents).filter(Boolean).length === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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