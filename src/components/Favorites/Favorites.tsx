import { useState, useEffect, useContext } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useLoading } from '../../contexts/LoadingContext';
import { ThemeContext } from '../../contexts/ThemeContext';

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

const Favorites = () => {
    const [favorites, setFavorites] = useState<FavoriteVenue[]>([]);
    const [error, setError] = useState<string | null>(null);
    const { colors } = useContext(ThemeContext);

    const { isLoading, setIsLoading, setLoadingMessage } = useLoading();

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                setLoadingMessage("Carregando locais favoritos...");
                setIsLoading(true);

                // Buscar apenas locais marcados como favoritos
                const venuesRef = collection(db, 'venues');
                const q = query(venuesRef, where('isFavorite', '==', true));
                const favoritesSnapshot = await getDocs(q);

                if (favoritesSnapshot.empty) {
                    setFavorites([]);
                    return;
                }

                // Atualizar mensagem para cada etapa do carregamento
                setLoadingMessage("Carregando profissionais...");

                // Buscar todos os profissionais favoritos
                const professionalsRef = collection(db, 'professionals');
                const profQuery = query(professionalsRef, where('isFavorite', '==', true));
                const professionalsSnapshot = await getDocs(profQuery);

                const favoriteProfessionals = professionalsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Professional));

                // Atualizar mensagem novamente
                setLoadingMessage("Carregando extras de orçamento...");

                // Buscar todos os itens de orçamento extras favoritos
                const budgetExtrasRef = collection(db, 'budgetExtras');
                const budgetExtrasQuery = query(budgetExtrasRef, where('isFavorite', '==', true));
                const budgetExtrasSnapshot = await getDocs(budgetExtrasQuery);

                const favoriteBudgetExtras = budgetExtrasSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as BudgetExtra));

                // Atualizar mensagem para a etapa final
                setLoadingMessage("Processando dados...");

                // Para cada local favorito, buscar os detalhes da cidade
                const favoritesWithDetails = await Promise.all(
                    favoritesSnapshot.docs.map(async (docSnap) => {
                        const venueData = docSnap.data();
                        const venueCost = venueData.venuePrice + venueData.foodPrice + venueData.drinkPrice;

                        // Filtrar profissionais desta cidade que são favoritos
                        const cityProfessionals = favoriteProfessionals.filter(
                            p => p.cityId === venueData.cityId
                        );

                        const professionalsCost = cityProfessionals.reduce(
                            (total, prof) => total + prof.price,
                            0
                        );

                        // Filtrar itens extras desta cidade que são favoritos
                        const cityBudgetExtras = favoriteBudgetExtras.filter(
                            item => item.cityId === venueData.cityId
                        );

                        // Calcular custo total dos extras (usar actualCost se disponível, senão estimatedCost)
                        const budgetExtrasCost = cityBudgetExtras.reduce(
                            (total, item) => total + (item.actualCost > 0 ? item.actualCost : item.estimatedCost),
                            0
                        );

                        // Calcular custo total incluindo os extras
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

                        // Buscar o nome da cidade
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
            } catch (err) {
                console.error('Erro ao buscar favoritos:', err);
                setError('Não foi possível carregar os favoritos. Por favor, tente novamente.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFavorites();
    }, []);

    if (error) {
        return (
            <div style={{
                backgroundColor: colors.error.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                borderColor: colors.error.replace('rgb(', 'rgba(').replace(')', ', 0.3)'),
                color: colors.error
            }} className="border px-4 py-3 rounded-lg">
                {error}
            </div>
        );
    }

    // Se não houver favoritos e ainda estiver carregando, não renderize nada
    // para evitar um flash de "sem favoritos" durante o carregamento
    if (favorites.length === 0 && isLoading) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-8" style={{ color: colors.text }}>Locais Favoritos</h2>

            {favorites.length === 0 ? (
                <div className="text-center py-12 rounded-xl border-2 border-dashed" style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border
                }}>
                    <div className="max-w-md mx-auto">
                        <svg className="mx-auto h-16 w-16 mb-4" style={{ color: colors.textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <p className="text-lg mb-2" style={{ color: colors.textSecondary }}>Você ainda não possui locais favoritos.</p>
                        <p style={{ color: colors.textSecondary }}>Acesse o Planejamento de Locais e adicione locais aos favoritos!</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {favorites.map(favorite => (
                        <div key={favorite.id} className="rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden" style={{
                            backgroundColor: colors.surface,
                            borderColor: colors.border
                        }}>
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold mb-1" style={{ color: colors.text }}>
                                            {favorite.venueName || 'Local não encontrado'}
                                        </h3>
                                        <p className="flex items-center" style={{ color: colors.textSecondary }}>
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {favorite.cityName || 'Cidade desconhecida'}
                                        </p>
                                    </div>
                                    <div style={{ color: colors.accent }}>
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </div>
                                </div>

                                {favorite.venueCost && (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-lg" style={{
                                            backgroundColor: colors.primary.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                                            borderColor: colors.primary.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                                        }}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>Custo do Local:</span>
                                                <span className="text-sm font-bold" style={{ color: colors.primary }}>
                                                    R$ {favorite.venueCost.toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>

                                        {(favorite.professionalsCost ?? 0) > 0 && (
                                            <div className="p-4 rounded-lg" style={{
                                                backgroundColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                                                borderColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                                            }}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>Custo de Profissionais:</span>
                                                    <span className="text-sm font-bold" style={{ color: colors.success }}>
                                                        R$ {(favorite.professionalsCost ?? 0).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>

                                                <div className="pt-3" style={{ borderTopColor: colors.success.replace('rgb(', 'rgba(').replace(')', ', 0.3)'), borderTopWidth: '1px' }}>
                                                    <p className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>Profissionais Incluídos:</p>
                                                    <ul className="space-y-1">
                                                        {favorite.selectedProfessionalNames?.map((prof, index) => (
                                                            <li key={index} className="text-xs flex justify-between" style={{ color: colors.textSecondary }}>
                                                                <span>{prof.name}</span>
                                                                <span>R$ {prof.price.toLocaleString('pt-BR')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        {(favorite.budgetExtrasCost ?? 0) > 0 && (
                                            <div className="p-4 rounded-lg" style={{
                                                backgroundColor: colors.secondary.replace('rgb(', 'rgba(').replace(')', ', 0.1)'),
                                                borderColor: colors.secondary.replace('rgb(', 'rgba(').replace(')', ', 0.3)')
                                            }}>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-medium" style={{ color: colors.textSecondary }}>Custos Extras:</span>
                                                    <span className="text-sm font-bold" style={{ color: colors.secondary }}>
                                                        R$ {(favorite.budgetExtrasCost ?? 0).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>

                                                <div className="pt-3" style={{ borderTopColor: colors.secondary.replace('rgb(', 'rgba(').replace(')', ', 0.3)'), borderTopWidth: '1px' }}>
                                                    <p className="text-xs font-medium mb-2" style={{ color: colors.textSecondary }}>Itens Extras Incluídos:</p>
                                                    <ul className="space-y-1">
                                                        {favorite.budgetExtrasItems?.map((item, index) => (
                                                            <li key={index} className="text-xs flex justify-between" style={{ color: colors.textSecondary }}>
                                                                <span>{item.description}</span>
                                                                <span>R$ {item.cost.toLocaleString('pt-BR')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-4 rounded-lg border-2" style={{
                                            backgroundColor: colors.accent.replace('rgb(', 'rgba(').replace(')', ', 0.2)'),
                                            borderColor: colors.accent
                                        }}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-base font-bold" style={{ color: colors.text }}>Custo Total Estimado:</span>
                                                <span className="text-lg font-bold" style={{ color: colors.text }}>
                                                    R$ {favorite.totalCost?.toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 pt-4" style={{ borderTopColor: colors.border, borderTopWidth: '1px' }}>
                                    <p className="text-sm flex items-center" style={{ color: colors.textSecondary }}>
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Adicionado em: {favorite.dateAdded instanceof Date
                                            ? favorite.dateAdded.toLocaleDateString('pt-BR')
                                            : new Date(favorite.dateAdded).toLocaleDateString('pt-BR')
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Favorites;