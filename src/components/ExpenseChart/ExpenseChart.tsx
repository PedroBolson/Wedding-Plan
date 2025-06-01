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
    const { darkTheme } = useContext(ThemeContext);
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
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
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
        return <div className="text-center p-8 text-red-600 dark:text-red-400 text-lg">{error}</div>;
    }

    if (favorites.length === 0) {
        return (
            <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg mb-6">
                <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-6">Gráfico de Gastos</h2>
                <div className="text-center p-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">Não há locais favoritos para exibir gráficos de gastos.</p>
                    <p className="text-gray-500 dark:text-gray-500">Adicione locais aos favoritos para visualizar suas distribuições de custos.</p>
                </div>
            </div>
        );
    }

    const currentFavorite = favorites.find(fav => fav.id === selectedFavorite) || favorites[0];
    const percentages = calculatePercentages(currentFavorite);

    return (
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg mb-6">
            <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-6">Gráfico de Gastos</h2>

            <div className="mb-8">
                <div className="w-full mb-4">
                    <label htmlFor="favorite-select" className="block mb-2 text-gray-700 dark:text-gray-300 font-medium">Escolha um Local Favorito:</label>
                    <select
                        id="favorite-select"
                        value={selectedFavorite || ''}
                        onChange={(e) => setSelectedFavorite(e.target.value)}
                        className="w-full p-3 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base appearance-none cursor-pointer focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                        style={{
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

            <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-2">{currentFavorite.venueName} - {currentFavorite.cityName}</h3>
            <p className="text-center font-semibold text-blue-600 dark:text-blue-400 text-lg mb-6">Custo Total: R$ {currentFavorite.totalCost?.toLocaleString('pt-BR')}</p>

            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-5 relative shadow-md hover:-translate-y-1 transition-transform duration-200 overflow-hidden">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Local</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">R$ {currentFavorite.venueCost?.toLocaleString('pt-BR')}</div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{percentages.venue.toFixed(1)}%</div>
                    <div className="absolute w-2 h-full top-0 left-0 bg-red-400" style={{ backgroundColor: 'rgba(255, 99, 132, 0.8)' }}></div>
                </div>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-5 relative shadow-md hover:-translate-y-1 transition-transform duration-200 overflow-hidden">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Profissionais</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">R$ {currentFavorite.professionalsCost?.toLocaleString('pt-BR')}</div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{percentages.professionals.toFixed(1)}%</div>
                    <div className="absolute w-2 h-full top-0 left-0 bg-blue-400" style={{ backgroundColor: 'rgba(54, 162, 235, 0.8)' }}></div>
                </div>

                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-5 relative shadow-md hover:-translate-y-1 transition-transform duration-200 overflow-hidden">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Extras</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">R$ {currentFavorite.budgetExtrasCost?.toLocaleString('pt-BR')}</div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">{percentages.extras.toFixed(1)}%</div>
                    <div className="absolute w-2 h-full top-0 left-0 bg-yellow-400" style={{ backgroundColor: 'rgba(255, 206, 86, 0.8)' }}></div>
                </div>
            </div>

            <div className="flex justify-center gap-4 my-8 flex-wrap">
                <button
                    className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 min-w-[120px] ${chartType === 'macro'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:-translate-y-1 hover:shadow-md'
                        }`}
                    onClick={() => setChartType('macro')}
                    disabled={isLoading}
                >
                    Visão Geral
                </button>
                <button
                    className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 min-w-[120px] ${chartType === 'professionals'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:-translate-y-1 hover:shadow-md'
                        } ${(!currentFavorite.selectedProfessionalNames?.length || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setChartType('professionals')}
                    disabled={isLoading || !currentFavorite.selectedProfessionalNames?.length}
                >
                    Profissionais
                </button>
                <button
                    className={`px-5 py-3 rounded-lg font-medium transition-all duration-200 min-w-[120px] ${chartType === 'extras'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:-translate-y-1 hover:shadow-md'
                        } ${(!currentFavorite.budgetExtrasItems?.length || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setChartType('extras')}
                    disabled={isLoading || !currentFavorite.budgetExtrasItems?.length}
                >
                    Extras
                </button>
            </div>

            <div className="mt-8 bg-gray-50 dark:bg-gray-800 p-6 rounded-xl shadow-inner border border-gray-200 dark:border-gray-700 text-center relative overflow-hidden max-w-full">
                {chartType === 'macro' && (
                    <>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-6">Distribuição Geral de Custos</h3>
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
                                                backgroundColor: darkTheme ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                                                bodyColor: darkTheme ? '#fff' : '#333',
                                                titleColor: darkTheme ? '#fff' : '#111',
                                                borderColor: darkTheme ? '#333' : '#ddd',
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
                                                    color: darkTheme ? 'rgba(255,255,255,0.8)' : '#333',
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
                                <h4 className="text-lg text-gray-900 dark:text-white mb-6 mt-0">Detalhamento de Custos</h4>
                                <div className="flex flex-col gap-5">
                                    {['Local', 'Profissionais', 'Extras'].map((category, index) => {
                                        const values = [
                                            currentFavorite.venueCost || 0,
                                            currentFavorite.professionalsCost || 0,
                                            currentFavorite.budgetExtrasCost || 0
                                        ];
                                        const colors = [
                                            'rgba(255, 99, 132, 0.8)',
                                            'rgba(54, 162, 235, 0.8)',
                                            'rgba(255, 206, 86, 0.8)'
                                        ];
                                        const percentage = ((values[index] / currentFavorite.totalCost!) * 100).toFixed(1);

                                        return (
                                            <div key={category} className="w-full">
                                                <div className="flex justify-between items-center mb-2 w-full">
                                                    <span className="font-semibold text-gray-900 dark:text-white flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap mr-2 text-sm">{category}</span>
                                                    <span className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap text-sm">{percentage}%</span>
                                                </div>
                                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden w-full">
                                                    <div
                                                        className="h-full rounded-md transition-all duration-1000 ease-out"
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: colors[index]
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
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-6">Distribuição de Custos por Profissionais</h3>
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
                                                        color: darkTheme ? 'rgba(255,255,255,0.8)' : '#333',
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
                                                    backgroundColor: darkTheme ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                                                    bodyColor: darkTheme ? '#fff' : '#333',
                                                    titleColor: darkTheme ? '#fff' : '#111',
                                                    borderColor: darkTheme ? '#333' : '#ddd',
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
                                    <h4 className="text-lg text-gray-900 dark:text-white mb-6 mt-0">Detalhamento por Profissional</h4>
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
                                                        <span className="font-semibold text-gray-900 dark:text-white flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap mr-2 text-sm">{prof.name}</span>
                                                        <span className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap text-sm">{percentage}%</span>
                                                    </div>
                                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden w-full">
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
                        <p className="text-center p-12 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Não há profissionais selecionados para este local.</p>
                    )
                ) : null}
                {chartType === 'extras' ? (
                    (currentFavorite.budgetExtrasItems && currentFavorite.budgetExtrasItems.length > 0) ? (
                        <>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-6">Distribuição de Custos Extras</h3>
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
                                                        color: darkTheme ? 'rgba(255,255,255,0.8)' : '#333',
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
                                                    backgroundColor: darkTheme ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                                                    bodyColor: darkTheme ? '#fff' : '#333',
                                                    titleColor: darkTheme ? '#fff' : '#111',
                                                    borderColor: darkTheme ? '#333' : '#ddd',
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
                                    <h4 className="text-lg text-gray-900 dark:text-white mb-6 mt-0">Detalhamento de Itens Extras</h4>
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
                                                        <span className="font-semibold text-gray-900 dark:text-white flex-1 text-left overflow-hidden text-ellipsis whitespace-nowrap mr-2 text-sm">{item.description}</span>
                                                        <span className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap text-sm">{percentage}%</span>
                                                    </div>
                                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden w-full">
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
                        <p className="text-center p-12 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400">Não há itens extras para este local.</p>
                    )
                ) : null}
            </div>
        </div>
    );
};

export default ExpenseChart;