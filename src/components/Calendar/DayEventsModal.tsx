import React from 'react';
import './Calendar.css';

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

    const getEventTypeClass = (type: string) => {
        switch (type) {
            case 'visita': return 'calendar-event-visit';
            case 'reuniao': return 'calendar-event-meeting';
            default: return 'calendar-event-other';
        }
    };

    return (
        <div className="calendar-day-events-modal-overlay">
            <div className="calendar-day-events-modal">
                <div className="calendar-day-events-header">
                    <h3>{formatDate(date)}</h3>
                    <button className="calendar-close-btn" onClick={onClose}>×</button>
                </div>

                {sortedEvents.length === 0 ? (
                    <div className="calendar-no-events-message">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                            <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 16L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M12 20.01L12.01 19.9989" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p>Nenhum evento agendado para este dia.</p>
                    </div>
                ) : (
                    <div className="calendar-day-events-list">
                        {sortedEvents.map(event => (
                            <div key={event.id} className={`calendar-day-event-item ${getEventTypeClass(event.type)}`} onClick={() => onEditEvent(event)}>
                                <div className="calendar-event-time-range">
                                    <span className="calendar-event-start-time">{formatTime(event.date)}</span>
                                    {event.endDate && (
                                        <>
                                            <span> - </span>
                                            <span className="calendar-event-end-time">{formatTime(event.endDate)}</span>
                                            <span className="calendar-event-duration"> {getEventDuration(event.date, event.endDate)}</span>
                                        </>
                                    )}
                                </div>
                                <h4 className="calendar-event-title">{event.title}</h4>
                                <div className="calendar-event-details">
                                    <span className="calendar-event-type-badge">{getEventTypeLabel(event.type)}</span>
                                    {event.location && <div className="calendar-event-location">📍 {event.location}</div>}
                                    <p className="calendar-event-description">{event.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="calendar-day-events-footer">
                    <button className="calendar-primary-btn" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default DayEventsModal;