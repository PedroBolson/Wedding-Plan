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

interface CalendarEventProps {
    event: Event;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({ event, onClick }) => {
    const getEventClasses = (type: string) => {
        const baseClasses = "px-2 py-1 mb-1 rounded text-xs cursor-pointer transition-all duration-200 block w-full box-border hover:transform hover:-translate-y-0.5 hover:shadow-md hover:z-10";
        switch (type) {
            case 'visita':
                return `${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 border-l-2 border-yellow-500 text-yellow-800 dark:text-yellow-200`;
            case 'reuniao':
                return `${baseClasses} bg-green-100 dark:bg-green-900/30 border-l-2 border-green-500 text-green-800 dark:text-green-200`;
            default:
                return `${baseClasses} bg-purple-100 dark:bg-purple-900/30 border-l-2 border-purple-500 text-purple-800 dark:text-purple-200`;
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
            className={getEventClasses(event.type)}
            onClick={onClick}
        >
            <div className="text-xs text-gray-600 dark:text-gray-400">{formatTimeDisplay()}</div>
            <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{event.title}</div>
        </div>
    );
};

export default CalendarEvent;