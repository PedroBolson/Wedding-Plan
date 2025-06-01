import React, { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

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
    const { colors } = useContext(ThemeContext);

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
                return {
                    className: baseClasses,
                    style: {
                        backgroundColor: colors.warning.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                        borderColor: colors.warning.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                    }
                };
            case 'reuniao':
                return {
                    className: baseClasses,
                    style: {
                        backgroundColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                        borderColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                    }
                };
            default:
                return {
                    className: baseClasses,
                    style: {
                        backgroundColor: colors.secondary.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                        borderColor: colors.secondary.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                    }
                };
        }
    };

    const getEventTypeBadgeStyle = (type: string) => {
        switch (type) {
            case 'visita':
                return {
                    backgroundColor: colors.warning.replace('rgb(', 'rgba(').replace(')', ', 0.2)'),
                    color: colors.warning
                };
            case 'reuniao':
                return {
                    backgroundColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.2)'),
                    color: colors.success
                };
            default:
                return {
                    backgroundColor: colors.secondary.replace('rgb(', 'rgba(').replace(')', ', 0.2)'),
                    color: colors.secondary
                };
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
            <div className="rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300"
                style={{ backgroundColor: colors.surface }}>
                <div className="flex justify-between items-center p-6 border-b sticky top-0 z-10"
                    style={{
                        borderColor: colors.border,
                        backgroundColor: colors.surface
                    }}>
                    <h3 className="text-xl font-bold capitalize" style={{ color: colors.text }}>
                        {formatDate(date)}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-3xl font-light transition-all duration-200 hover:scale-110 leading-none"
                        style={{ color: colors.textSecondary }}
                        onMouseEnter={(e) => e.currentTarget.style.color = colors.text}
                        onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                    >
                        ×
                    </button>
                </div>

                {sortedEvents.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-4" style={{ color: colors.textSecondary }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ color: colors.textSecondary }}>
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
                        {sortedEvents.map(event => {
                            const eventStyle = getEventTypeClasses(event.type);
                            const badgeStyle = getEventTypeBadgeStyle(event.type);

                            return (
                                <div key={event.id} className={eventStyle.className} style={eventStyle.style} onClick={() => onEditEvent(event)}>
                                    <div className="text-sm mb-2 font-medium" style={{ color: colors.textSecondary }}>
                                        <span>{formatTime(event.date)}</span>
                                        {event.endDate && (
                                            <>
                                                <span> - </span>
                                                <span>{formatTime(event.endDate)}</span>
                                                <span className="text-xs font-normal" style={{ color: colors.textSecondary }}> {getEventDuration(event.date, event.endDate)}</span>
                                            </>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-semibold mb-3" style={{ color: colors.text }}>{event.title}</h4>
                                    <div className="text-sm" style={{ color: colors.textSecondary }}>
                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mr-3"
                                            style={badgeStyle}>
                                            {getEventTypeLabel(event.type)}
                                        </span>
                                        {event.location && (
                                            <div className="flex items-center gap-1 mt-3" style={{ color: colors.textSecondary }}>
                                                <span>📍</span>
                                                <span>{event.location}</span>
                                            </div>
                                        )}
                                        <p className="mt-3 whitespace-pre-line" style={{ color: colors.text }}>{event.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="p-6 border-t text-right" style={{ borderColor: colors.border }}>
                    <button
                        onClick={onClose}
                        className="text-white px-5 py-2 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                        style={{ backgroundColor: colors.primary }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DayEventsModal;