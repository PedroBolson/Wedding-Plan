import React, { useState, useEffect } from 'react';

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5 pb-4 border-b border-gray-200 dark:border-gray-700">
                    {event ? 'Editar Evento' : 'Novo Evento'}
                </h3>

                {!showDeleteConfirmation ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Título
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="Nome do evento"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Data
                                </label>
                                <input
                                    type="date"
                                    id="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div>
                                <label htmlFor="time" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Hora de início
                                </label>
                                <input
                                    type="time"
                                    id="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 cursor-pointer" onClick={toggleEndDate}>
                            <input
                                type="checkbox"
                                id="enableEndDate"
                                checked={endDateEnabled}
                                onChange={toggleEndDate}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            />
                            <label htmlFor="enableEndDate" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                Definir hora de término
                            </label>
                        </div>

                        {endDateEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Data de término
                                    </label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        required={endDateEnabled}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="endTime" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Hora de término
                                    </label>
                                    <input
                                        type="time"
                                        id="endTime"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required={endDateEnabled}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="type" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Tipo de evento
                            </label>
                            <div className="relative">
                                <select
                                    id="type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as 'visita' | 'reuniao' | 'outro')}
                                    required
                                    className="w-full px-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="visita">Visita a local</option>
                                    <option value="reuniao">Reunião</option>
                                    <option value="outro">Outro</option>
                                </select>
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-blue-600 dark:text-blue-400">
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
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="location" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Local
                            </label>
                            <input
                                type="text"
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Endereço ou local do evento"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Descrição
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                placeholder="Detalhes sobre o evento, anotações, etc."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                            <div className="flex gap-3 flex-1">
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    Salvar
                                </button>
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={handleShowDeleteConfirmation}
                                    className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 px-6 py-3 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                >
                                    Excluir
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="text-center animate-in fade-in duration-300">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Confirmar exclusão
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            Tem certeza que deseja excluir <strong className="text-gray-900 dark:text-white">{title}</strong>?
                            <br />
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
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