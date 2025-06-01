import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import EventForm from './EventForm';
import CalendarEvent from './CalendarEvent';
import DayEventsModal from './DayEventsModal';
import GoogleCalendarIntegration from './GoogleCalendarIntegration';
import { GoogleOAuthProvider } from '@react-oauth/google';

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
                    className="aspect-square min-h-[60px] sm:min-h-[100px] bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
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
                    className={`aspect-square min-h-[60px] sm:min-h-[100px] border border-gray-200 dark:border-gray-700 rounded-lg p-2 relative cursor-pointer transition-all duration-200 bg-white dark:bg-gray-800 flex flex-col overflow-hidden ${dayEvents.length > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        } ${isToday ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                        } hover:bg-gray-50 dark:hover:bg-gray-700 hover:transform hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-gray-900/30`}
                    onClick={() => openDayEvents(date)}
                >
                    <div className={`text-sm font-medium mb-2 ${isToday
                            ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center -m-1 mb-1'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                        {day}
                    </div>

                    {/* Indicador de eventos centralizado para mobile */}
                    {sortedDayEvents.length > 0 && isMobile && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 dark:bg-blue-500 text-white min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-medium shadow-sm">
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
                                <div className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-medium">
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
        <div className="w-full max-w-7xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-gray-900/30 p-5">
            <div className="flex flex-col lg:flex-row justify-between items-center pb-5 border-b border-gray-200 dark:border-gray-700 gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendário de Eventos</h2>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={prevMonth}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-all duration-200"
                        >
                            &lt;
                        </button>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 min-w-[140px] text-center pt-1">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-all duration-200"
                        >
                            &gt;
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedEvent(null);
                            setShowEventForm(true);
                        }}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
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

            <div className="grid grid-cols-7 gap-2 py-4 font-semibold border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-center">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-4">
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