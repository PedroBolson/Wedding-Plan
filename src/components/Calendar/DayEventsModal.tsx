import React from 'react';

interface Event {
    id?: string;
    title: string;
    date: Date;
    endDate?: Date;
    description: string;
    type: 'visita' | 'reuniao' | 'outro';
    location?: string;
}

interface DayEventsModalProps {
    date: Date;
    events: Event[];
    onClose: () => void;
    onEditEvent: (event: Event) => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({ date, events, onClose, onEditEvent }) => {
    // Ordenar eventos por hora de início
    const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Formatar data para exibição
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Formatar hora para exibição
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Função para obter a duração do evento
    const getEventDuration = (startDate: Date, endDate?: Date) => {
        if (!endDate) return '';

        const durationMs = endDate.getTime() - startDate.getTime();
        const durationMinutes = Math.floor(durationMs / 60000);

        if (durationMinutes < 60) {
            return `(${durationMinutes} min)`;
        } else {
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            return `(${hours}h${minutes > 0 ? ` ${minutes}min` : ''})`;
        }
    };

    const getEventTypeLabel = (type: string) => {
        switch (type) {
            case 'visita': return 'Visita';
            case 'reuniao': return 'Reunião';
            default: return 'Outro';
        }
    };

    const getEventTypeClasses = (type: string) => {
        const baseClasses = "p-4 rounded-lg mb-4 cursor-pointer transition-all duration-200 border hover:transform hover:-translate-y-1 hover:shadow-lg";
        switch (type) {
            case 'visita':
                return `${baseClasses} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 hover:border-yellow-300 dark:hover:border-yellow-600`;
            case 'reuniao':
                return `${baseClasses} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600`;
            default:
                return `${baseClasses} bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600`;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                        {formatDate(date)}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-3xl font-light transition-all duration-200 hover:scale-110 leading-none"
                    >
                        ×
                    </button>
                </div>

                {sortedEvents.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-4">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-gray-300 dark:text-gray-600">
                            <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 16L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M12 20.01L12.01 19.9989" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-lg">Nenhum evento agendado para este dia.</p>
                    </div>
                ) : (
                    <div className="p-6 flex-1 overflow-y-auto">
                        {sortedEvents.map(event => (
                            <div key={event.id} className={getEventTypeClasses(event.type)} onClick={() => onEditEvent(event)}>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
                                    <span>{formatTime(event.date)}</span>
                                    {event.endDate && (
                                        <>
                                            <span> - </span>
                                            <span>{formatTime(event.endDate)}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-500 font-normal"> {getEventDuration(event.date, event.endDate)}</span>
                                        </>
                                    )}
                                </div>
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{event.title}</h4>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mr-3 ${event.type === 'visita' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' :
                                            event.type === 'reuniao' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' :
                                                'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200'
                                        }`}>
                                        {getEventTypeLabel(event.type)}
                                    </span>
                                    {event.location && (
                                        <div className="flex items-center gap-1 mt-3 text-gray-600 dark:text-gray-400">
                                            <span>📍</span>
                                            <span>{event.location}</span>
                                        </div>
                                    )}
                                    <p className="mt-3 text-gray-700 dark:text-gray-300 whitespace-pre-line">{event.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 text-right">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DayEventsModal;