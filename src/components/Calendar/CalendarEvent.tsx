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

interface CalendarEventProps {
    event: Event;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const CalendarEvent: React.FC<CalendarEventProps> = ({ event, onClick }) => {
    const { colors } = useContext(ThemeContext);

    const getEventStyles = (type: string) => {
        const baseStyles = {
            padding: '0.25rem 0.5rem',
            marginBottom: '0.25rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'block' as const,
            width: '100%',
            boxSizing: 'border-box' as const,
            borderLeft: '2px solid'
        };

        switch (type) {
            case 'visita':
                return {
                    ...baseStyles,
                    backgroundColor: colors.accent + '40',
                    borderLeftColor: colors.accent,
                    color: colors.text
                };
            case 'reuniao':
                return {
                    ...baseStyles,
                    backgroundColor: colors.primary + '40',
                    borderLeftColor: colors.primary,
                    color: colors.text
                };
            default:
                return {
                    ...baseStyles,
                    backgroundColor: colors.secondary + '40',
                    borderLeftColor: colors.secondary,
                    color: colors.text
                };
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
            style={{
                ...getEventStyles(event.type),
                transform: 'translateY(0)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.zIndex = '10';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.zIndex = 'auto';
            }}
        >
            <div style={{ fontSize: '0.75rem', color: colors.textSecondary }}>{formatTimeDisplay()}</div>
            <div style={{
                fontWeight: '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
            }}>{event.title}</div>
        </div>
    );
};

export default CalendarEvent;