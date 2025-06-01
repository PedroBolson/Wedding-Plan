import React, { useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import EventForm from './EventForm';
import CalendarEvent from './CalendarEvent';
import DayEventsModal from './DayEventsModal';
import GoogleCalendarIntegration from './GoogleCalendarIntegration';
import { GoogleOAuthProvider } from '@react-oauth/google';
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

const Calendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [showEventForm, setShowEventForm] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const { colors } = useContext(ThemeContext);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const eventsCollection = collection(db, 'events');
                const eventsSnapshot = await getDocs(query(eventsCollection));

                if (eventsSnapshot.empty) {
                    console.log("Nenhum evento encontrado");
                    setEvents([]);
                    return;
                }

                const eventsList = eventsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date.toDate(),
                    endDate: doc.data().endDate ? doc.data().endDate.toDate() : undefined
                } as Event));
                setEvents(eventsList);
            } catch (error) {
                console.error("Erro ao carregar eventos:", error);
            }
        };

        fetchEvents();
    }, []);

    // Gerar dias do mês atual
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    // Navegar entre meses
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Adicionar novo evento
    const addEvent = async (event: Event) => {
        try {
            // Verificar se o usuário está autenticado
            if (!auth.currentUser) {
                alert("Você precisa estar logado para criar eventos.");
                return;
            }

            const { id, ...eventWithoutId } = event;

            // Certificar-se de que as datas são no formato correto do Firestore
            const eventData = {
                ...eventWithoutId,
                title: event.title,
                description: event.description,
                type: event.type,
                location: event.location || '',
                date: new Date(event.date),
                endDate: event.endDate ? new Date(event.endDate) : null,
                createdAt: new Date(),
                updatedAt: new Date(),
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email
            };

            const docRef = await addDoc(collection(db, 'events'), eventData);

            // Adicionar o evento com ID à lista local
            setEvents(prevEvents => [...prevEvents, { ...event, id: docRef.id }]);
            setShowEventForm(false);

            // Feedback visual
            console.log("Evento criado com sucesso:", docRef.id);
        } catch (error) {
            console.error("Erro ao adicionar evento:", error);
            alert("Ocorreu um erro ao salvar o evento. Por favor, tente novamente.");
        }
    };

    // Atualizar evento
    const updateEvent = async (event: Event) => {
        if (!event.id) return;

        try {
            await updateDoc(doc(db, 'events', event.id), {
                title: event.title,
                description: event.description,
                type: event.type,
                location: event.location || '',
                date: new Date(event.date),
                endDate: event.endDate ? new Date(event.endDate) : null,
                updatedAt: new Date()
            });

            setEvents(events.map(e => e.id === event.id ? event : e));
            setShowEventForm(false);
            setSelectedEvent(null);
        } catch (error) {
            console.error("Erro ao atualizar evento:", error);
            alert("Ocorreu um erro ao atualizar o evento. Por favor, tente novamente.");
        }
    };

    // Excluir evento
    const deleteEvent = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'events', id));
            setEvents(events.filter(event => event.id !== id));
            setShowEventForm(false);
            setSelectedEvent(null);
            console.log("Evento excluído com sucesso");
        } catch (error) {
            console.error("Erro ao excluir evento:", error);
            alert("Ocorreu um erro ao excluir o evento. Por favor, tente novamente.");
        }
    };

    const confirmDeleteEvent = (id: string) => {
        return () => deleteEvent(id);
    };

    // Abrir modal com eventos do dia
    const openDayEvents = (date: Date) => {
        setSelectedDay(date);
    };

    // Fechar modal de eventos do dia
    const closeDayEvents = () => {
        setSelectedDay(null);
    };

    const handleImportEvents = (importedEvents: Event[]) => {
        // Função para adicionar eventos importados ao banco de dados e estado local
        const addImportedEvents = async () => {
            try {
                const newEvents: Event[] = [];

                for (const event of importedEvents) {
                    const docRef = await addDoc(collection(db, 'events'), {
                        ...event,
                        date: new Date(event.date),
                        endDate: event.endDate ? new Date(event.endDate) : null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        userId: auth.currentUser?.uid,
                        userEmail: auth.currentUser?.email,
                        importedFromGoogleCalendar: true
                    });

                    newEvents.push({
                        ...event,
                        id: docRef.id
                    });
                }

                setEvents(prev => [...prev, ...newEvents]);
            } catch (error) {
                console.error("Erro ao importar eventos:", error);
            }
        };

        if (importedEvents.length > 0) {
            addImportedEvents();
        }
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];

        // Dias vazios do início do mês
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div
                    key={`empty-${i}`}
                    className="aspect-square min-h-[50px] sm:min-h-[80px] md:min-h-[100px] border border-dashed rounded-lg"
                    style={{
                        backgroundColor: colors.background,
                        borderColor: colors.border
                    }}
                />
            );
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = new Date().toDateString() === date.toDateString();
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getDate() === day &&
                    eventDate.getMonth() === month &&
                    eventDate.getFullYear() === year;
            });

            // Ordenar eventos por hora
            const sortedDayEvents = dayEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

            const isMobile = window.innerWidth <= 480;

            const visibleEvents = isMobile ? [] : sortedDayEvents.slice(0, 2);
            const hasMoreEvents = !isMobile && sortedDayEvents.length > 2;

            days.push(
                <div
                    key={day}
                    className={`aspect-square min-h-[50px] sm:min-h-[80px] md:min-h-[100px] border rounded-lg p-1 sm:p-2 relative cursor-pointer transition-all duration-200 flex flex-col overflow-hidden ${isToday ? 'ring-2' : ''
                        } hover:transform hover:-translate-y-0.5 hover:shadow-lg`}
                    style={{
                        backgroundColor: dayEvents.length > 0
                            ? colors.primary.replace('rgb(', 'rgba(').replace(')', ', 0.1)')
                            : colors.surface,
                        borderColor: colors.border
                    }}
                    onClick={() => openDayEvents(date)}
                >
                    <div className={`text-xs sm:text-sm font-medium mb-1 sm:mb-2 ${isToday
                        ? 'text-white rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center -m-1 mb-1'
                        : ''
                        }`}
                        style={{
                            backgroundColor: isToday ? colors.primary : 'transparent',
                            color: isToday ? 'white' : colors.text
                        }}>
                        {day}
                    </div>

                    {/* Indicador de eventos centralizado para mobile */}
                    {sortedDayEvents.length > 0 && isMobile && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-xs font-medium shadow-sm"
                            style={{ backgroundColor: colors.primary }}>
                            {sortedDayEvents.length}
                        </div>
                    )}

                    {/* Apenas no desktop, mostrar eventos detalhados */}
                    {!isMobile && (
                        <div className="flex flex-col w-full overflow-hidden flex-1">
                            {visibleEvents.map((event: Event) => (
                                <CalendarEvent
                                    key={event.id}
                                    event={event}
                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                        e.stopPropagation();
                                        setSelectedEvent(event);
                                        setShowEventForm(true);
                                    }}
                                />
                            ))}
                            {hasMoreEvents && (
                                <div className="text-xs text-center mt-1 px-2 py-1 rounded font-medium"
                                    style={{
                                        color: colors.textSecondary,
                                        backgroundColor: colors.background
                                    }}>
                                    +{sortedDayEvents.length - 2} evento(s)
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        return days;
    };

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Obter eventos do dia selecionado
    const getEventsForSelectedDay = () => {
        if (!selectedDay) return [];

        return events.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.getDate() === selectedDay.getDate() &&
                eventDate.getMonth() === selectedDay.getMonth() &&
                eventDate.getFullYear() === selectedDay.getFullYear();
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto rounded-xl shadow-lg p-3 sm:p-5" style={{ backgroundColor: colors.surface }}>
            <div className="flex flex-col gap-4 pb-4 sm:pb-5 border-b" style={{ borderColor: colors.border }}>
                <h2 className="text-xl sm:text-2xl font-bold text-center sm:text-left" style={{ color: colors.text }}>Calendário de Eventos</h2>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={prevMonth}
                            className="border rounded-lg px-2 sm:px-3 py-2 transition-all duration-200 text-lg sm:text-base"
                            style={{
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.textSecondary
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.primary;
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface;
                                e.currentTarget.style.color = colors.textSecondary;
                            }}
                        >
                            &lt;
                        </button>
                        <h3 className="text-base sm:text-lg font-semibold min-w-[120px] sm:min-w-[140px] text-center pt-1" style={{ color: colors.text }}>
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="border rounded-lg px-2 sm:px-3 py-2 transition-all duration-200 text-lg sm:text-base"
                            style={{
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                color: colors.textSecondary
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.primary;
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colors.surface;
                                e.currentTarget.style.color = colors.textSecondary;
                            }}
                        >
                            &gt;
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedEvent(null);
                            setShowEventForm(true);
                        }}
                        className="w-full sm:w-auto text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg text-sm sm:text-base"
                        style={{
                            backgroundColor: colors.primary
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.primaryHover;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.primary;
                        }}
                    >
                        Adicionar Evento
                    </button>
                </div>
            </div>

            <GoogleOAuthProvider clientId={import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID}>
                <GoogleCalendarIntegration
                    events={events}
                    onImportEvents={handleImportEvents}
                />
            </GoogleOAuthProvider>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 py-3 sm:py-4 font-semibold border-b text-center text-xs sm:text-sm" style={{
                borderColor: colors.border,
                color: colors.textSecondary
            }}>
                <div className="hidden sm:block">Domingo</div>
                <div className="hidden sm:block">Segunda</div>
                <div className="hidden sm:block">Terça</div>
                <div className="hidden sm:block">Quarta</div>
                <div className="hidden sm:block">Quinta</div>
                <div className="hidden sm:block">Sexta</div>
                <div className="hidden sm:block">Sábado</div>
                <div className="sm:hidden">Dom</div>
                <div className="sm:hidden">Seg</div>
                <div className="sm:hidden">Ter</div>
                <div className="sm:hidden">Qua</div>
                <div className="sm:hidden">Qui</div>
                <div className="sm:hidden">Sex</div>
                <div className="sm:hidden">Sáb</div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3 sm:pt-4">
                {renderCalendar()}
            </div>

            {showEventForm && (
                <EventForm
                    event={selectedEvent || undefined}
                    onSubmit={selectedEvent ? updateEvent : addEvent}
                    onCancel={() => {
                        setShowEventForm(false);
                        setSelectedEvent(null);
                    }}
                    onDelete={selectedEvent?.id ? confirmDeleteEvent(selectedEvent.id) : undefined}
                />
            )}

            {selectedDay && (
                <DayEventsModal
                    date={selectedDay}
                    events={getEventsForSelectedDay()}
                    onClose={closeDayEvents}
                    onEditEvent={(event) => {
                        setSelectedEvent(event);
                        setShowEventForm(true);
                        closeDayEvents();
                    }}
                />
            )}
        </div>
    );
};

export default Calendar;