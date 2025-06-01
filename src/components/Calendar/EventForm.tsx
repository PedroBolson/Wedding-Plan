import React, { useState, useEffect, useContext } from 'react';
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

interface EventFormProps {
    event?: Event;
    onSubmit: (event: Event) => void;
    onCancel: () => void;
    onDelete?: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ event, onSubmit, onCancel, onDelete }) => {
    const { colors } = useContext(ThemeContext);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
            <div style={{
                backgroundColor: colors.background,
                borderRadius: '0.75rem',
                padding: '1rem',
                width: '100%',
                maxWidth: '28rem',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }} className="animate-in slide-in-from-bottom-4 duration-300 sm:p-6 sm:max-w-lg sm:max-h-85vh">
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: colors.text,
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: `1px solid ${colors.border}`
                }} className="sm:text-xl sm:mb-5 sm:pb-4">
                    {event ? 'Editar Evento' : 'Novo Evento'}
                </h3>

                {!showDeleteConfirmation ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label htmlFor="title" style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: '0.5rem'
                            }}>
                                Título
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="Nome do evento"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0.5rem',
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = colors.primary;
                                    e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = colors.border;
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label htmlFor="date" style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: '0.5rem'
                                    }}>
                                        Data
                                    </label>
                                    <input
                                        type="date"
                                        id="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0.5rem',
                                            backgroundColor: colors.surface,
                                            color: colors.text,
                                            fontSize: '1rem',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = colors.primary;
                                            e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = colors.border;
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="time" style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: '0.5rem'
                                    }}>
                                        Hora de início
                                    </label>
                                    <input
                                        type="time"
                                        id="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0.5rem',
                                            backgroundColor: colors.surface,
                                            color: colors.text,
                                            fontSize: '1rem',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = colors.primary;
                                            e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = colors.border;
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={toggleEndDate}>
                            <input
                                type="checkbox"
                                id="enableEndDate"
                                checked={endDateEnabled}
                                onChange={toggleEndDate}
                                style={{
                                    width: '1rem',
                                    height: '1rem',
                                    cursor: 'pointer',
                                    accentColor: colors.primary
                                }}
                            />
                            <label htmlFor="enableEndDate" style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: colors.text,
                                cursor: 'pointer'
                            }}>
                                Definir hora de término
                            </label>
                        </div>

                        {endDateEnabled && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label htmlFor="endDate" style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: '0.5rem'
                                    }}>
                                        Data de término
                                    </label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        required={endDateEnabled}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0.5rem',
                                            backgroundColor: colors.surface,
                                            color: colors.text,
                                            fontSize: '1rem',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = colors.primary;
                                            e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = colors.border;
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="endTime" style={{
                                        display: 'block',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: '0.5rem'
                                    }}>
                                        Hora de término
                                    </label>
                                    <input
                                        type="time"
                                        id="endTime"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        required={endDateEnabled}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: '0.5rem',
                                            backgroundColor: colors.surface,
                                            color: colors.text,
                                            fontSize: '1rem',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = colors.primary;
                                            e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = colors.border;
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="type" style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: '0.5rem'
                            }}>
                                Tipo de evento
                            </label>
                            <div style={{ position: 'relative' }}>
                                <select
                                    id="type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value as 'visita' | 'reuniao' | 'outro')}
                                    required
                                    style={{
                                        width: '100%',
                                        paddingLeft: '3rem',
                                        paddingRight: '3rem',
                                        paddingTop: '0.75rem',
                                        paddingBottom: '0.75rem',
                                        border: `1px solid ${colors.border}`,
                                        borderRadius: '0.5rem',
                                        backgroundColor: colors.surface,
                                        color: colors.text,
                                        fontSize: '1rem',
                                        appearance: 'none',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.2s, box-shadow 0.2s'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = colors.primary;
                                        e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = colors.border;
                                        e.target.style.boxShadow = 'none';
                                    }}
                                >
                                    <option value="visita">Visita a local</option>
                                    <option value="reuniao">Reunião</option>
                                    <option value="outro">Outro</option>
                                </select>
                                <div style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: colors.primary
                                }}>
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
                                <div style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: colors.textSecondary
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="location" style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: '0.5rem'
                            }}>
                                Local
                            </label>
                            <input
                                type="text"
                                id="location"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Endereço ou local do evento"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0.5rem',
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = colors.primary;
                                    e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = colors.border;
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div>
                            <label htmlFor="description" style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: colors.text,
                                marginBottom: '0.5rem'
                            }}>
                                Descrição
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                placeholder="Detalhes sobre o evento, anotações, etc."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0.5rem',
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                    fontSize: '1rem',
                                    resize: 'vertical',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = colors.primary;
                                    e.target.style.boxShadow = `0 0 0 2px ${colors.primary}20`;
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = colors.border;
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', flex: '1' }}>
                                <button
                                    type="submit"
                                    style={{
                                        flex: '1',
                                        backgroundColor: colors.primary,
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.5rem',
                                        fontWeight: '600',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        transform: 'translateY(0)',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.primaryHover;
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.primary;
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                    }}
                                >
                                    Salvar
                                </button>
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    style={{
                                        flex: '1',
                                        backgroundColor: colors.surface,
                                        color: colors.text,
                                        border: `1px solid ${colors.border}`,
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.5rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'colors 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.surfaceHover;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.surface;
                                    }}
                                >
                                    Cancelar
                                </button>
                            </div>
                            {onDelete && (
                                <button
                                    type="button"
                                    onClick={handleShowDeleteConfirmation}
                                    style={{
                                        backgroundColor: colors.error + '10',
                                        color: colors.error,
                                        border: `1px solid ${colors.error}`,
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.5rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'colors 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.error + '20';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.error + '10';
                                    }}
                                >
                                    Excluir
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <h4 style={{
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: colors.text,
                            marginBottom: '1rem'
                        }}>
                            Confirmar exclusão
                        </h4>
                        <p style={{
                            color: colors.textSecondary,
                            marginBottom: '1.5rem',
                            lineHeight: '1.6'
                        }}>
                            Tem certeza que deseja excluir <strong style={{ color: colors.text }}>{title}</strong>?
                            <br />
                            Esta ação não pode ser desfeita.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: colors.surface,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '0.5rem',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'colors 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.surfaceHover;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.surface;
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: colors.error,
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    fontWeight: '500',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'colors 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.error + 'dd';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.error;
                                }}
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