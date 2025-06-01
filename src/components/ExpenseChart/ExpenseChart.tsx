import { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useLoading } from '../../contexts/LoadingContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
        hoverOffset?: number;
    }[];
}

interface FavoriteVenue {
    id: string;
    venueId: string;
    cityId?: string;
    venueName?: string;
    cityName?: string;
    venueCost?: number;
    professionalsCost?: number;
    budgetExtrasCost?: number;
    totalCost?: number;
    dateAdded: Date;
    selectedProfessionalNames?: { name: string; price: number }[];
    budgetExtrasItems?: { description: string; cost: number }[];
}

interface Professional {
    id: string;
    name: string;
    price: number;
    isFavorite: boolean;
    cityId: string;
}

interface BudgetExtra {
    id: string;
    description: string;
    category: string;
    cityId: string;
    estimatedCost: number;
    actualCost: number;
    paid: boolean;
    isFavorite: boolean;
}

const ExpenseChart = () => {
    const { darkTheme, colors } = useContext(ThemeContext);
    const [favorites, setFavorites] = useState<FavoriteVenue[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedFavorite, setSelectedFavorite] = useState<string | null>(null);
    const [chartType, setChartType] = useState<'macro' | 'professionals' | 'extras'>('macro');

    const { isLoading, setIsLoading, setLoadingMessage } = useLoading();

    useEffect(() => {
        let isMounted = true; // Variável para controlar se o componente ainda está montado

        const fetchFavorites = async () => {
            try {
                if (isMounted) {
                    setLoadingMessage("Carregando gráficos de despesas...");
                    setIsLoading(true);
                }

                // Buscar locais favoritos
                const venuesRef = collection(db, 'venues');
                const q = query(venuesRef, where('isFavorite', '==', true));
                const favoritesSnapshot = await getDocs(q);

                if (favoritesSnapshot.empty) {
                    if (isMounted) {
                        setFavorites([]);
                        setIsLoading(false);
                    }
                    return;
                }

                // Atualizar mensagem durante o processo
                if (isMounted) {
                    setLoadingMessage("Processando dados dos profissionais...");
                }

                // Buscar profissionais favoritos
                const professionalsRef = collection(db, 'professionals');
                const profQuery = query(professionalsRef, where('isFavorite', '==', true));
                const professionalsSnapshot = await getDocs(profQuery);

                const favoriteProfessionals = professionalsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Professional));

                // Atualizar mensagem novamente
                if (isMounted) {
                    setLoadingMessage("Processando itens extras...");
                }

                // Buscar itens extras favoritos
                const budgetExtrasRef = collection(db, 'budgetExtras');
                const budgetExtrasQuery = query(budgetExtrasRef, where('isFavorite', '==', true));
                const budgetExtrasSnapshot = await getDocs(budgetExtrasQuery);

                const favoriteBudgetExtras = budgetExtrasSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as BudgetExtra));

                // Última etapa de processamento
                if (isMounted) {
                    setLoadingMessage("Finalizando cálculos...");
                }

                // Para cada local favorito, processar os dados
                const favoritesWithDetails = await Promise.all(
                    favoritesSnapshot.docs.map(async (docSnap) => {
                        const venueData = docSnap.data();
                        const venueCost = venueData.venuePrice + venueData.foodPrice + venueData.drinkPrice;

                        // Filtrar profissionais desta cidade
                        const cityProfessionals = favoriteProfessionals.filter(
                            p => p.cityId === venueData.cityId
                        );

                        const professionalsCost = cityProfessionals.reduce(
                            (total, prof) => total + prof.price,
                            0
                        );

                        // Filtrar itens extras desta cidade
                        const cityBudgetExtras = favoriteBudgetExtras.filter(
                            item => item.cityId === venueData.cityId
                        );

                        const budgetExtrasCost = cityBudgetExtras.reduce(
                            (total, item) => total + (item.actualCost > 0 ? item.actualCost : item.estimatedCost),
                            0
                        );

                        const totalCost = venueCost + professionalsCost + budgetExtrasCost;

                        const favorite = {
                            id: docSnap.id,
                            venueId: docSnap.id,
                            cityId: venueData.cityId,
                            venueName: venueData.name,
                            venueCost: venueCost,
                            professionalsCost: professionalsCost,
                            budgetExtrasCost: budgetExtrasCost,
                            totalCost: totalCost,
                            dateAdded: venueData.favoritedAt ? new Date(venueData.favoritedAt.seconds * 1000) : new Date(),
                            selectedProfessionalNames: cityProfessionals.map(p => ({
                                name: p.name,
                                price: p.price
                            })),
                            budgetExtrasItems: cityBudgetExtras.map(item => ({
                                description: item.description,
                                cost: item.actualCost > 0 ? item.actualCost : item.estimatedCost
                            }))
                        } as FavoriteVenue;

                        // Buscar nome da cidade
                        if (venueData.cityId) {
                            const cityRef = doc(db, 'cities', venueData.cityId);
                            const citySnap = await getDoc(cityRef);

                            if (citySnap.exists()) {
                                favorite.cityName = citySnap.data().name;
                            }
                        }

                        return favorite;
                    })
                );

                // Verificar se o componente ainda está montado antes de atualizar o estado
                if (isMounted) {
                    setFavorites(favoritesWithDetails);
                    if (favoritesWithDetails.length > 0) {
                        setSelectedFavorite(favoritesWithDetails[0].id);
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar dados para gráficos:', err);
                if (isMounted) {
                    setError('Não foi possível carregar os dados para os gráficos. Por favor, tente novamente.');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchFavorites();

        // Função de limpeza para quando o componente for desmontado
        return () => {
            isMounted = false;
        };
    }, []);
    // Preparar dados para o gráfico macro
    const getMacroChartData = (favorite: FavoriteVenue): ChartData => {
        return {
            labels: ['Local', 'Profissionais', 'Extras'],
            datasets: [
                {
                    label: 'Distribuição de custos',
                    data: [
                        favorite.venueCost || 0,
                        favorite.professionalsCost || 0,
                        favorite.budgetExtrasCost || 0
                    ],
                    backgroundColor: [
                        colors.primary.replace('rgb(', 'rgba(').replace(')', ', 0.8)'),
                        colors.secondary.replace('rgb(', 'rgba(').replace(')', ', 0.8)'),
                        colors.accent.replace('rgb(', 'rgba(').replace(')', ', 0.8)')
                    ],
                    borderColor: [
                        colors.primary,
                        colors.secondary,
                        colors.accent
                    ],
                    borderWidth: 2,
                    hoverOffset: 20,
                },
            ],
        };
    };

    // Preparar dados para o gráfico de profissionais
    const getProfessionalsChartData = (favorite: FavoriteVenue): ChartData => {
        const labels = favorite.selectedProfessionalNames?.map(prof => prof.name) || [];
        const data = favorite.selectedProfessionalNames?.map(prof => prof.price) || [];

        // Gerar cores dinamicamente para o número de profissionais
        const generateColors = (count: number) => {
            const colors = [];
            for (let i = 0; i < count; i++) {
                const hue = (i * 137.5) % 360;
                colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
            }
            return colors;
        };

        const backgroundColor = generateColors(labels.length);
        const borderColor = backgroundColor.map(color => color.replace('0.7', '1'));

        return {
            labels,
            datasets: [
                {
                    label: 'Custos de Profissionais',
                    data,
                    backgroundColor,
                    borderColor,
                    borderWidth: 1,
                    hoverOffset: 20,
                },
            ],
        };
    };

    // Preparar dados para o gráfico de extras
    const getExtrasChartData = (favorite: FavoriteVenue): ChartData => {
        const labels = favorite.budgetExtrasItems?.map(item => item.description) || [];
        const data = favorite.budgetExtrasItems?.map(item => item.cost) || [];

        // Gerar cores dinamicamente para o número de itens extras
        const generateColors = (count: number) => {
            const colors = [];
            for (let i = 0; i < count; i++) {
                const hue = (i * 137.5 + 60) % 360;
                colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
            }
            return colors;
        };

        const backgroundColor = generateColors(labels.length);
        const borderColor = backgroundColor.map(color => color.replace('0.7', '1'));

        return {
            labels,
            datasets: [
                {
                    label: 'Custos Extras',
                    data,
                    backgroundColor,
                    borderColor,
                    borderWidth: 1,
                    hoverOffset: 20,
                },
            ],
        };
    };

    // Calcular percentuais para exibição
    const calculatePercentages = (favorite: FavoriteVenue) => {
        const total = favorite.totalCost || 0;
        if (total === 0) return { venue: 0, professionals: 0, extras: 0 };

        return {
            venue: ((favorite.venueCost || 0) / total) * 100,
            professionals: ((favorite.professionalsCost || 0) / total) * 100,
            extras: ((favorite.budgetExtrasCost || 0) / total) * 100
        };
    };

    if (error) {
        return <div className="text-center p-8 text-lg" style={{ color: colors.error }}>{error}</div>;
    }

    if (favorites.length === 0) {
        return (
            <div className="p-6 rounded-xl shadow-lg mb-6" style={{ backgroundColor: colors.surface }}>
                <h2 className="text-2xl font-semibold text-center mb-6" style={{ color: colors.text }}>Gráfico de Gastos</h2>
                <div className="text-center p-12 rounded-lg" style={{ backgroundColor: colors.background }}>
                    <p className="text-lg mb-4" style={{ color: colors.textSecondary }}>Não há locais favoritos para exibir gráficos de gastos.</p>
                    <p style={{ color: colors.textSecondary }}>Adicione locais aos favoritos para visualizar suas distribuições de custos.</p>
                </div>
            </div>
        );
    }

    const currentFavorite = favorites.find(fav => fav.id === selectedFavorite) || favorites[0];
    const percentages = calculatePercentages(currentFavorite);

    return (
        <div className="p-6 rounded-xl shadow-lg mb-6" style={{ backgroundColor: colors.surface }}>
            <h2 className="text-2xl font-semibold text-center mb-6" style={{ color: colors.text }}>Gráfico de Gastos</h2>

            <div className="mb-8">
                <div className="w-full mb-4">
                    <label htmlFor="favorite-select" className="block mb-2 font-medium" style={{ color: colors.text }}>Escolha um Local Favorito:</label>
                    <select
                        id="favorite-select"
                        value={selectedFavorite || ''}
                        onChange={(e) => setSelectedFavorite(e.target.value)}
                        className="w-full p-3 pr-8 rounded-lg border text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-opacity-20"
                        style={{
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'><path d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/></svg>")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'calc(100% - 12px) center'
                        }}
                    >
                        {favorites.map(favorite => (
                            <option key={favorite.id} value={favorite.id}>
                                {favorite.venueName} - {favorite.cityName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <h3 className="text-xl font-semibold text-center mb-2" style={{ color: colors.text }}>{currentFavorite.venueName} - {currentFavorite.cityName}</h3>
            <p className="text-center font-semibold text-lg mb-6" style={{ color: colors.primary }}>Custo Total: R$ {currentFavorite.totalCost?.toLocaleString('pt-BR')}</p>

            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
                <div className="flex-1 rounded-lg p-5 relative shadow-md hover:-translate-y-1 transition-transform duration-200 overflow-hidden" style={{ backgroundColor: colors.surface }}>
                    <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>Local</div>
                    <div className="text-xl font-bold mb-1" style={{ color: colors.text }}>R$ {currentFavorite.venueCost?.toLocaleString('pt-BR')}</div>
                    <div className="text-lg font-semibold" style={{ color: colors.primary }}>{percentages.venue.toFixed(1)}%</div>
                    <div className="absolute w-2 h-full top-0 left-0" style={{ backgroundColor: colors.primary }}></div>
                </div>

                <div className="flex-1 rounded-lg p-5 relative shadow-md hover:-translate-y-1 transition-transform duration-200 overflow-hidden" style={{ backgroundColor: colors.surface }}>
                    <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>Profissionais</div>
                    <div className="text-xl font-bold mb-1" style={{ color: colors.text }}>R$ {currentFavorite.professionalsCost?.toLocaleString('pt-BR')}</div>
                    <div className="text-lg font-semibold" style={{ color: colors.secondary }}>{percentages.professionals.toFixed(1)}%</div>
                    <div className="absolute w-2 h-full top-0 left-0" style={{ backgroundColor: colors.secondary }}></div>
                </div>

                <div className="flex-1 rounded-lg p-5 relative shadow-md hover:-translate-y-1 transition-transform duration-200 overflow-hidden" style={{ backgroundColor: colors.surface }}>
                    <div className="text-sm mb-2" style={{ color: colors.textSecondary }}>Extras</div>
                    <div className="text-xl font-bold mb-1" style={{ color: colors.text }}>R$ {currentFavorite.budgetExtrasCost?.toLocaleString('pt-BR')}</div>
                    <div className="text-lg font-semibold" style={{ color: colors.accent }}>{percentages.extras.toFixed(1)}%</div>
                    <div className="absolute w-2 h-full top-0 left-0" style={{ backgroundColor: colors.accent }}></div>
                </div>
            </div>

            <div className="flex justify-center gap-4 my-8 flex-wrap">
                <button
                    className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 min-w-[120px] ${chartType === 'macro'
                        ? 'text-white shadow-lg'
                        : 'hover:-translate-y-1 hover:shadow-md'
                        }`}
                    style={{
                        backgroundColor: chartType === 'macro' ? colors.primary : colors.surface,
                        color: chartType === 'macro' ? 'white' : colors.textSecondary,
                        boxShadow: chartType === 'macro' ? `0 10px 15px -3px ${colors.primary}30` : undefined
                    }}
                    onClick={() => setChartType('macro')}
                    disabled={isLoading}
                >
                    Visão Geral
                </button>
                <button
                    className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 min-w-[120px] ${chartType === 'professionals'
                        ? 'text-white shadow-lg'
                        : 'hover:-translate-y-1 hover:shadow-md'
                        } ${(!currentFavorite.selectedProfessionalNames?.length || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                        backgroundColor: chartType === 'professionals' ? colors.primary : colors.surface,
                        color: chartType === 'professionals' ? 'white' : colors.textSecondary,
                        boxShadow: chartType === 'professionals' ? `0 10px 15px -3px ${colors.primary}30` : undefined
                    }}
                    onClick={() => setChartType('professionals')}
                    disabled={isLoading || !currentFavorite.selectedProfessionalNames?.length}
                >
                    Profissionais
                </button>
                <button
                    className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 min-w-[120px] ${chartType === 'extras'
                        ? 'text-white shadow-lg'
                        : 'hover:-translate-y-1 hover:shadow-md'
                        } ${(!currentFavorite.budgetExtrasItems?.length || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                        backgroundColor: chartType === 'extras' ? colors.primary : colors.surface,
                        color: chartType === 'extras' ? 'white' : colors.textSecondary,
                        boxShadow: chartType === 'extras' ? `0 10px 15px -3px ${colors.primary}30` : undefined
                    }}
                    onClick={() => setChartType('extras')}
                    disabled={isLoading || !currentFavorite.budgetExtrasItems?.length}
                >
                    Extras
                </button>
            </div>

            <div className="mt-8 p-6 rounded-xl shadow-inner border text-center relative overflow-hidden max-w-full" style={{
                backgroundColor: colors.background,
                borderColor: colors.border
            }}>
                {chartType === 'macro' && (
                    <>
                        <h3 className="text-xl font-semibold text-center mb-6" style={{ color: colors.text }}>Distribuição Geral de Custos</h3>
                        <div className="flex flex-col lg:flex-row gap-8 mt-6 flex-wrap overflow-visible w-full">
                            <div className="flex-1 min-w-[300px] relative rounded-lg overflow-visible bg-transparent">
                                <div className="h-[350px] w-full max-w-[500px] mx-auto relative overflow-visible">
                                    <Pie data={getMacroChartData(currentFavorite)} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            tooltip: {
                                                enabled: true,
                                                position: 'nearest',
                                                callbacks: {
                                                    label: function (context) {
                                                        const label = context.label || '';
                                                        const value = context.parsed || 0;
                                                        const dataset = context.dataset;
                                                        const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                                                        const percentage = ((value * 100) / total).toFixed(1);
                                                        return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
                                                    }
                                                },
                                                padding: 12,
                                                boxPadding: 6,
                                                caretSize: 8,
                                                caretPadding: 10,
                                                displayColors: true,
                                                backgroundColor: darkTheme ? colors.surface : colors.surface,
                                                bodyColor: colors.text,
                                                titleColor: colors.text,
                                                borderColor: colors.border,
                                                borderWidth: 1,
                                                titleFont: {
                                                    weight: 'bold'
                                                },
                                                bodyFont: {
                                                    size: 14
                                                }
                                            },
                                            legend: {
                                                position: 'right',
                                                labels: {
                                                    color: colors.text,
                                                    font: {
                                                        size: 14,
                                                        weight: 500
                                                    },
                                                    padding: 20,
                                                    usePointStyle: true,
                                                    pointStyle: 'circle'
                                                }
                                            },
                                        },
                                        animation: {
                                            animateRotate: true,
                                            animateScale: true,
                                            duration: 1500
                                        }
                                    }} />
                                </div>
                            </div>

                            <div className="flex-1 min-w-[300px] flex flex-col justify-center w-full px-2">
                                <h4 className="text-lg mb-6 mt-0" style={{ color: colors.text }}>Detalhamento de Custos</h4>
                                <div className="flex flex-col gap-5">
                                    {['Local', 'Profissionais', 'Extras'].map((category, index) => {
                                        const values = [
                                            currentFavorite.venueCost || 0,
                                            currentFavorite.professionalsCost || 0,
                                            currentFavorite.budgetExtrasCost || 0
                                        ];
                                        const chartColors = [colors.primary, colors.secondary, colors.accent];
                                        const percentage = ((values[index] / currentFavorite.totalCost!) * 100).toFixed(1);

                                        return (
                                            <div key={category} className="w-full">
                                                <div className="flex justify-between items-center mb-2 w-full">
                                                    <span className="font-semibold flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap mr-2 text-sm" style={{ color: colors.text }}>{category}</span>
                                                    <span className="font-semibold whitespace-nowrap text-sm" style={{ color: colors.primary }}>{percentage}%</span>
                                                </div>
                                                <div className="h-3 rounded-md overflow-hidden w-full" style={{ backgroundColor: colors.border }}>
                                                    <div
                                                        className="h-full rounded-md transition-all duration-1000 ease-out"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: chartColors[index]
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {chartType === 'professionals' ? (
                    (currentFavorite.selectedProfessionalNames && currentFavorite.selectedProfessionalNames.length > 0) ? (
                        <>
                            <h3 className="text-xl font-semibold text-center mb-6" style={{ color: colors.text }}>Distribuição de Custos por Profissionais</h3>
                            <div className="flex flex-col lg:flex-row gap-8 mt-6 flex-wrap overflow-visible w-full">
                                <div className="flex-1 min-w-[300px] relative rounded-lg overflow-visible bg-transparent">
                                    <div className="h-[350px] w-full max-w-[500px] mx-auto relative overflow-visible">
                                        <Pie data={getProfessionalsChartData(currentFavorite)} options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'right',
                                                    labels: {
                                                        color: colors.text,
                                                        font: {
                                                            size: 14,
                                                            weight: 500
                                                        },
                                                        padding: 20,
                                                        usePointStyle: true,
                                                        pointStyle: 'circle'
                                                    }
                                                },
                                                tooltip: {
                                                    enabled: true,
                                                    position: 'nearest',
                                                    callbacks: {
                                                        label: function (context) {
                                                            const label = context.label || '';
                                                            const value = context.parsed || 0;
                                                            const dataset = context.dataset;
                                                            const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                                                            const percentage = ((value * 100) / total).toFixed(1);
                                                            return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
                                                        }
                                                    },
                                                    padding: 12,
                                                    boxPadding: 6,
                                                    caretSize: 8,
                                                    caretPadding: 10,
                                                    displayColors: true,
                                                    backgroundColor: darkTheme ? colors.surface : colors.surface,
                                                    bodyColor: colors.text,
                                                    titleColor: colors.text,
                                                    borderColor: colors.border,
                                                    borderWidth: 1,
                                                    titleFont: {
                                                        weight: 'bold'
                                                    },
                                                    bodyFont: {
                                                        size: 14
                                                    }
                                                }
                                            },
                                        }} />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-[300px] flex flex-col justify-center w-full px-2">
                                    <h4 className="text-lg mb-6 mt-0" style={{ color: colors.text }}>Detalhamento por Profissional</h4>
                                    <div className="flex flex-col gap-5">
                                        {(currentFavorite.selectedProfessionalNames || []).map((prof, index) => {
                                            const cost = prof.price || 0;
                                            const totalProf = (currentFavorite.selectedProfessionalNames || []).reduce((sum, p) => sum + (p.price || 0), 0);
                                            const percentage = totalProf > 0 ? ((cost / totalProf) * 100).toFixed(1) : '0.0';

                                            // Gerar cor consistente
                                            const hue = (index * 137.5) % 360;
                                            const color = `hsla(${hue}, 70%, 60%, 0.8)`;

                                            return (
                                                <div key={prof.name} className="w-full">
                                                    <div className="flex justify-between items-center mb-2 w-full">
                                                        <span className="font-semibold flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap mr-2 text-sm" style={{ color: colors.text }}>{prof.name}</span>
                                                        <span className="font-semibold whitespace-nowrap text-sm" style={{ color: colors.primary }}>{percentage}%</span>
                                                    </div>
                                                    <div className="h-3 rounded-md overflow-hidden w-full" style={{ backgroundColor: colors.border }}>
                                                        <div
                                                            className="h-full rounded-md transition-all duration-1000 ease-out"
                                                            style={{
                                                                width: `${percentage}%`,
                                                                backgroundColor: color
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-center p-12 rounded-lg" style={{
                            backgroundColor: colors.surface,
                            color: colors.textSecondary
                        }}>Não há profissionais selecionados para este local.</p>
                    )
                ) : null}

                {chartType === 'extras' ? (
                    (currentFavorite.budgetExtrasItems && currentFavorite.budgetExtrasItems.length > 0) ? (
                        <>
                            <h3 className="text-xl font-semibold text-center mb-6" style={{ color: colors.text }}>Distribuição de Custos Extras</h3>
                            <div className="flex flex-col lg:flex-row gap-8 mt-6 flex-wrap overflow-visible w-full">
                                <div className="flex-1 min-w-[300px] relative rounded-lg overflow-visible bg-transparent">
                                    <div className="h-[350px] w-full max-w-[500px] mx-auto relative overflow-visible">
                                        <Pie data={getExtrasChartData(currentFavorite)} options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'right',
                                                    labels: {
                                                        color: colors.text,
                                                        font: {
                                                            size: 14,
                                                            weight: 500
                                                        },
                                                        padding: 20,
                                                        usePointStyle: true,
                                                        pointStyle: 'circle'
                                                    }
                                                },
                                                tooltip: {
                                                    enabled: true,
                                                    position: 'nearest',
                                                    callbacks: {
                                                        label: function (context) {
                                                            const label = context.label || '';
                                                            const value = context.parsed || 0;
                                                            const dataset = context.dataset;
                                                            const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                                                            const percentage = ((value * 100) / total).toFixed(1);
                                                            return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
                                                        }
                                                    },
                                                    padding: 12,
                                                    boxPadding: 6,
                                                    caretSize: 8,
                                                    caretPadding: 10,
                                                    displayColors: true,
                                                    backgroundColor: darkTheme ? colors.surface : colors.surface,
                                                    bodyColor: colors.text,
                                                    titleColor: colors.text,
                                                    borderColor: colors.border,
                                                    borderWidth: 1,
                                                    titleFont: {
                                                        weight: 'bold'
                                                    },
                                                    bodyFont: {
                                                        size: 14
                                                    }
                                                }
                                            },
                                        }} />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-[300px] flex flex-col justify-center w-full px-2">
                                    <h4 className="text-lg mb-6 mt-0" style={{ color: colors.text }}>Detalhamento de Itens Extras</h4>
                                    <div className="flex flex-col gap-5">
                                        {currentFavorite.budgetExtrasItems?.map((item, index) => {
                                            const totalExtras = currentFavorite.budgetExtrasItems?.reduce((sum, item) => sum + item.cost, 0) || 0;
                                            const percentage = totalExtras > 0 ? ((item.cost / totalExtras) * 100).toFixed(1) : '0.0';

                                            // Gerar cor consistente
                                            const hue = (index * 137.5 + 60) % 360;
                                            const color = `hsla(${hue}, 70%, 60%, 0.8)`;

                                            return (
                                                <div key={index} className="w-full">
                                                    <div className="flex justify-between items-center mb-2 w-full">
                                                        <span className="font-semibold flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap mr-2 text-sm" style={{ color: colors.text }}>{item.description}</span>
                                                        <span className="font-semibold whitespace-nowrap text-sm" style={{ color: colors.primary }}>{percentage}%</span>
                                                    </div>
                                                    <div className="h-3 rounded-md overflow-hidden w-full" style={{ backgroundColor: colors.border }}>
                                                        <div
                                                            className="h-full rounded-md transition-all duration-1000 ease-out"
                                                            style={{
                                                                width: `${percentage}%`,
                                                                backgroundColor: color
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-center p-12 rounded-lg" style={{
                            backgroundColor: colors.surface,
                            color: colors.textSecondary
                        }}>Não há itens extras para este local.</p>
                    )
                ) : null}
            </div>
        </div>
    );
};

export default ExpenseChart;