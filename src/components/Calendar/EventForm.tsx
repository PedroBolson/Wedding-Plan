import React, { useState, useEffect } from 'react';
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

interface EventFormProps {
    event?: Event;
    onSubmit: (event: Event) => void;
    onCancel: () => void;
    onDelete?: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ event, onSubmit, onCancel, onDelete }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'visita' | 'reuniao' | 'outro'>('reuniao');
    const [location, setLocation] = useState('');
    const [endDateEnabled, setEndDateEnabled] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    useEffect(() => {
        if (event) {
            setTitle(event.title);
            setDate(formatDateForInput(event.date));
            setTime(formatTimeForInput(event.date));

            if (event.endDate) {
                setEndDateEnabled(true);
                setEndDate(formatDateForInput(event.endDate));
                setEndTime(formatTimeForInput(event.endDate));
            } else {
                setEndDateEnabled(false);
                setEndDate(formatDateForInput(event.date));
                setEndTime('');
            }

            setDescription(event.description);
            setType(event.type);
            setLocation(event.location || '');
        } else {
            const now = new Date();
            setDate(formatDateForInput(now));
            setTime(formatTimeForInput(now));
            setEndDate(formatDateForInput(now));
            setEndDateEnabled(false);
        }
    }, [event]);

    const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatTimeForInput = (date: Date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const startDateTime = new Date(`${date}T${time}:00`);

            const newEvent: Event = {
                id: event?.id,
                title,
                date: startDateTime,
                description,
                type,
                location
            };

            if (endDateEnabled && endDate && endTime) {
                const endDateTime = new Date(`${endDate}T${endTime}:00`);
                newEvent.endDate = endDateTime;
            }

            onSubmit(newEvent);
        } catch (error) {
            console.error("Erro ao criar data do evento:", error);
            alert("Erro ao criar evento. Verifique os campos e tente novamente.");
        }
    };

    const toggleEndDate = () => {
        setEndDateEnabled(!endDateEnabled);
        if (!endDateEnabled && !endTime) {
            const startDateTime = new Date(`${date}T${time}`);
            const defaultEndDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
            setEndTime(formatTimeForInput(defaultEndDateTime));
        }
    };

    const handleShowDeleteConfirmation = () => {
        setShowDeleteConfirmation(true);
    };

    const handleConfirmDelete = () => {
        if (onDelete) {
            onDelete();
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirmation(false);
    };

    return (
        <div className="calendar-event-form-overlay">
            <div className="calendar-event-form-container">
                <h3>{event ? 'Editar Evento' : 'Novo Evento'}</h3>

                {!showDeleteConfirmation ? (
                    <form onSubmit={handleSubmit}>
                        <div className="calendar-form-group">
                            <label htmlFor="title">Título</label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="Nome do evento"
                            />
                        </div>

                        <div className="calendar-form-row">
                            <div className="calendar-form-group">
                                <label htmlFor="date">Data</label>
                                <input
                                    type="date"
                                    id="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="calendar-form-group">
                                <label htmlFor="time">Hora de início</label>
                                <input
                                    type="time"
                                    id="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="calendar-form-group calendar-end-date-toggle">
                            <input
                                type="checkbox"
                                id="enableEndDate"
                                checked={endDateEnabled}
                                onChange={toggleEndDate}
                            />
                            <label htmlFor="enableEndDate">Definir hora de término</label>
                        </div>

                        {endDateEnabled && (
                            <div className="calendar-form-row">
                                <div className="calendar-form-group">
                                    <label htmlFor="endDate">Data de término</label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        required={endDateEnabled}
                                    />
                                </div>

                                <div className="calendar-form-group">
                                    <label htmlFor="endTime">Hora de término</label>
                                    <input
                                        type="time"
                                        id="endTime"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required={endDateEnabled}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="calendar-form-group">
                            <label htmlFor="type">Tipo de evento</label>
                            <div className="calendar-custom-select">
                                <select
                                    id="type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as 'visita' | 'reuniao' | 'outro')}
                                    required
                                    className="calendar-select-input"
                                >
                                    <option value="visita">Visita a local</option>
                                    <option value="reuniao">Reunião</option>
                                    <option value="outro">Outro</option>
                                </select>
                                <div className="calendar-select-icon">
                                    {type === 'visita' && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                        </svg>
                                    )}
                                    {type === 'reuniao' && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    )}
                                    {type === 'outro' && (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    )}
                                </div>
                                <div className="calendar-select-arrow">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                <div className={`calendar-select-badge ${type}`}>
                                    {type === 'visita' && 'Visita a local'}
                                    {type === 'reuniao' && 'Reunião'}
                                    {type === 'outro' && 'Outro'}
                                </div>
                            </div>
                        </div>

                        <div className="calendar-form-group">
                            <label htmlFor="location">Local</label>
                            <input
                                type="text"
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Endereço ou local do evento"
                            />
                        </div>

                        <div className="calendar-form-group">
                            <label htmlFor="description">Descrição</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                placeholder="Detalhes sobre o evento, anotações, etc."
                            />
                        </div>

                        <div className="calendar-form-actions">
                            <button type="submit" className="calendar-save-btn">Salvar</button>
                            <button type="button" className="calendar-cancel-btn" onClick={onCancel}>Cancelar</button>
                            {onDelete && (
                                <button
                                    type="button"
                                    className="calendar-delete-btn"
                                    onClick={handleShowDeleteConfirmation}
                                >
                                    Excluir
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="calendar-inline-delete-confirmation">
                        <h4>Confirmar exclusão</h4>
                        <p>
                            Tem certeza que deseja excluir <strong>{title}</strong>?
                            <br />
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="calendar-form-actions">
                            <button
                                type="button"
                                className="calendar-cancel-btn"
                                onClick={handleCancelDelete}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="calendar-delete-btn"
                                onClick={handleConfirmDelete}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventForm;