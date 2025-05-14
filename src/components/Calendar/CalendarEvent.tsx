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

interface CalendarEventProps {
    event: Event;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({ event, onClick }) => {
    const getEventColor = (type: string) => {
        switch (type) {
            case 'visita': return 'calendar-event-visit';
            case 'reuniao': return 'calendar-event-meeting';
            default: return 'calendar-event-other';
        }
    };

    const getTimeString = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Formatar horários: se tiver horário de fim, mostrar "início - fim"
    const formatTimeDisplay = () => {
        const startTime = getTimeString(new Date(event.date));

        // Se tiver data de término, mostrar com hífen
        if (event.endDate) {
            const endTime = getTimeString(new Date(event.endDate));
            return `${startTime} - ${endTime}`;
        }

        // Caso contrário, mostrar apenas o horário de início
        return startTime;
    };

    return (
        <div
            className={`calendar-event ${getEventColor(event.type)}`}
            onClick={onClick}
        >
            <div className="calendar-event-time">{formatTimeDisplay()}</div>
            <div className="calendar-event-title">{event.title}</div>
        </div>
    );
};

export default CalendarEvent;