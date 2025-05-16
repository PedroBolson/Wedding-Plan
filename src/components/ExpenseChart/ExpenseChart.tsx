import { useState, useEffect, useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import './ExpenseChart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        backgroundColor: string[];
        borderColor: string[];
        borderWidth: number;
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFavorite, setSelectedFavorite] = useState<string | null>(null);
    const [chartType, setChartType] = useState<'macro' | 'professionals' | 'extras'>('macro');

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                setLoading(true);
                // Buscar locais favoritos
                const venuesRef = collection(db, 'venues');
                const q = query(venuesRef, where('isFavorite', '==', true));
                const favoritesSnapshot = await getDocs(q);

                if (favoritesSnapshot.empty) {
                    setFavorites([]);
                    setLoading(false);
                    return;
                }

                // Buscar profissionais favoritos
                const professionalsRef = collection(db, 'professionals');
                const profQuery = query(professionalsRef, where('isFavorite', '==', true));
                const professionalsSnapshot = await getDocs(profQuery);

                const favoriteProfessionals = professionalsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Professional));

                // Buscar itens extras favoritos
                const budgetExtrasRef = collection(db, 'budgetExtras');
                const budgetExtrasQuery = query(budgetExtrasRef, where('isFavorite', '==', true));
                const budgetExtrasSnapshot = await getDocs(budgetExtrasQuery);

                const favoriteBudgetExtras = budgetExtrasSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as BudgetExtra));

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

                setFavorites(favoritesWithDetails);
                if (favoritesWithDetails.length > 0) {
                    setSelectedFavorite(favoritesWithDetails[0].id);
                }
            } catch (err) {
                console.error('Erro ao buscar dados para gráficos:', err);
                setError('Não foi possível carregar os dados para os gráficos. Por favor, tente novamente.');
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, []);

    useEffect(() => {
        const handleThemeChange = () => {
            setChartType(prevType => prevType);
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.attributeName === 'class' &&
                    (mutation.target === document.documentElement || mutation.target === document.body)
                ) {
                    handleThemeChange();
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        observer.observe(document.body, { attributes: true });

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', handleThemeChange);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', handleThemeChange);
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
                    backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)'],
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)'],
                    borderWidth: 1,
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

    if (loading) {
        return <div className="exp-chart__loading">Carregando dados dos gráficos...</div>;
    }

    if (error) {
        return <div className="exp-chart__error">{error}</div>;
    }

    if (favorites.length === 0) {
        return (
            <div className="exp-chart">
                <h2 className="exp-chart__title">Gráfico de Gastos</h2>
                <div className="exp-chart__empty-state">
                    <p>Não há locais favoritos para exibir gráficos de gastos.</p>
                    <p>Adicione locais aos favoritos para visualizar suas distribuições de custos.</p>
                </div>
            </div>
        );
    }

    const currentFavorite = favorites.find(fav => fav.id === selectedFavorite) || favorites[0];
    const percentages = calculatePercentages(currentFavorite);

    return (
        <div className="exp-chart">
            <h2 className="exp-chart__title">Gráfico de Gastos</h2>

            <div className="exp-chart__controls">
                <div className="exp-chart__favorite-selector">
                    <label htmlFor="favorite-select">Escolha um Local Favorito:</label>
                    <select
                        id="favorite-select"
                        value={selectedFavorite || ''}
                        onChange={(e) => setSelectedFavorite(e.target.value)}
                    >
                        {favorites.map(favorite => (
                            <option key={favorite.id} value={favorite.id}>
                                {favorite.venueName} - {favorite.cityName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="exp-chart__summary">
                <h3 className="exp-chart__venue-name">{currentFavorite.venueName} - {currentFavorite.cityName}</h3>
                <p className="exp-chart__total">Custo Total: R$ {currentFavorite.totalCost?.toLocaleString('pt-BR')}</p>

                <div className="exp-chart__percentages">
                    <div className="exp-chart__percentage-item">
                        <span className="exp-chart__category">Local:</span>
                        <span className="exp-chart__value">{percentages.venue.toFixed(1)}%</span>
                        <span className="exp-chart__amount">R$ {currentFavorite.venueCost?.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="exp-chart__percentage-item">
                        <span className="exp-chart__category">Profissionais:</span>
                        <span className="exp-chart__value">{percentages.professionals.toFixed(1)}%</span>
                        <span className="exp-chart__amount">R$ {currentFavorite.professionalsCost?.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="exp-chart__percentage-item">
                        <span className="exp-chart__category">Extras:</span>
                        <span className="exp-chart__value">{percentages.extras.toFixed(1)}%</span>
                        <span className="exp-chart__amount">R$ {currentFavorite.budgetExtrasCost?.toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            <div className="exp-chart__mobile-type-selector">
                <button
                    className={chartType === 'macro' ? 'exp-chart__btn exp-chart__btn--active' : 'exp-chart__btn'}
                    onClick={() => setChartType('macro')}
                >
                    Visão Geral
                </button>
                <button
                    className={chartType === 'professionals' ? 'exp-chart__btn exp-chart__btn--active' : 'exp-chart__btn'}
                    onClick={() => setChartType('professionals')}
                    disabled={!currentFavorite.selectedProfessionalNames?.length}
                >
                    Profissionais
                </button>
                <button
                    className={chartType === 'extras' ? 'exp-chart__btn exp-chart__btn--active' : 'exp-chart__btn'}
                    onClick={() => setChartType('extras')}
                    disabled={!currentFavorite.budgetExtrasItems?.length}
                >
                    Extras
                </button>
            </div>

            <div className="exp-chart__visualizations">
                {chartType === 'macro' && (
                    <>
                        <h3 className="exp-chart__section-title">Distribuição Geral de Custos</h3>
                        <div className="exp-chart__charts-container">
                            <div className="exp-chart__pie-container">
                                <div className="exp-chart__pie">
                                    <Pie data={getMacroChartData(currentFavorite)} options={{
                                        plugins: {
                                            legend: {
                                                labels: {
                                                    color: darkTheme ? 'rgba(255,255,255,0.8)' : 'var(--text-primary, #333)',
                                                    font: {
                                                        size: 13,
                                                        weight: 500
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                callbacks: {
                                                    label: function (context) {
                                                        const label = context.label || '';
                                                        const value = context.parsed || 0;
                                                        const dataset = context.dataset;
                                                        const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                                                        const percentage = ((value * 100) / total).toFixed(1);
                                                        return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
                                                    }
                                                }
                                            }
                                        }
                                    }} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {chartType === 'professionals' && currentFavorite.selectedProfessionalNames?.length ? (
                    <>
                        <h3 className="exp-chart__section-title">Custos por Profissionais</h3>
                        <div className="exp-chart__charts-container">
                            <div className="exp-chart__pie-container">
                                <div className="exp-chart__pie">
                                    <Pie data={getProfessionalsChartData(currentFavorite)} options={{
                                        plugins: {
                                            legend: {
                                                labels: {
                                                    color: darkTheme ? 'rgba(255,255,255,0.8)' : 'var(--text-primary, #333)',
                                                    font: {
                                                        size: 13,
                                                        weight: 500
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                callbacks: {
                                                    label: function (context) {
                                                        const label = context.label || '';
                                                        const value = context.parsed || 0;
                                                        const dataset = context.dataset;
                                                        const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                                                        const percentage = ((value * 100) / total).toFixed(1);
                                                        return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
                                                    }
                                                }
                                            }
                                        }
                                    }} />
                                </div>
                            </div>
                        </div>
                    </>
                ) : chartType === 'professionals' ? (
                    <p className="exp-chart__no-data">Não há profissionais selecionados para este local.</p>
                ) : null}

                {chartType === 'extras' && currentFavorite.budgetExtrasItems?.length ? (
                    <>
                        <h3 className="exp-chart__section-title">Custos Extras</h3>
                        <div className="exp-chart__charts-container">
                            <div className="exp-chart__pie-container">
                                <div className="exp-chart__pie">
                                    <Pie data={getExtrasChartData(currentFavorite)} options={{
                                        plugins: {
                                            legend: {
                                                labels: {
                                                    color: darkTheme ? 'rgba(255,255,255,0.8)' : 'var(--text-primary, #333)',
                                                    font: {
                                                        size: 13,
                                                        weight: 500
                                                    }
                                                }
                                            },
                                            tooltip: {
                                                callbacks: {
                                                    label: function (context) {
                                                        const label = context.label || '';
                                                        const value = context.parsed || 0;
                                                        const dataset = context.dataset;
                                                        const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                                                        const percentage = ((value * 100) / total).toFixed(1);
                                                        return `${label}: R$ ${value.toLocaleString('pt-BR')} (${percentage}%)`;
                                                    }
                                                }
                                            }
                                        }
                                    }} />
                                </div>
                            </div>
                        </div>
                    </>
                ) : chartType === 'extras' ? (
                    <p className="exp-chart__no-data">Não há itens extras para este local.</p>
                ) : null}
            </div>
        </div>
    );
};

export default ExpenseChart;