import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import EventForm from './EventForm';
import CalendarEvent from './CalendarEvent';
import DayEventsModal from './DayEventsModal';
import GoogleCalendarIntegration from './GoogleCalendarIntegration';
import { GoogleOAuthProvider } from '@react-oauth/google';
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
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
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
                    className={`calendar-day ${dayEvents.length > 0 ? 'has-events' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => openDayEvents(date)}
                >
                    <div className="calendar-day-number">{day}</div>

                    {/* Indicador de eventos centralizado */}
                    {sortedDayEvents.length > 0 && isMobile && (
                        <div className="calendar-mobile-events-count">
                            {sortedDayEvents.length}
                        </div>
                    )}

                    {/* Apenas no desktop, mostrar eventos detalhados */}
                    {!isMobile && (
                        <div className="calendar-day-events">
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
                                <div className="calendar-more-events">
                                    +{sortedDayEvents.length - 2} evento(s) {/* Alterado de 3 para 2 */}
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
        <div className="calendar-container">
            <div className="calendar-header">
                <h2>Calendário de Eventos</h2>
                <div className="calendar-controls">
                    <button onClick={prevMonth}>&lt;</button>
                    <h3 style={{ paddingTop: '4%' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                    <button onClick={nextMonth}>&gt;</button>
                    <button
                        className="calendar-add-event-btn"
                        onClick={() => {
                            setSelectedEvent(null);
                            setShowEventForm(true);
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

            <div className="calendar-weekdays">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
            </div>

            <div className="calendar-days">
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