import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './Favorites.css';

interface FavoriteVenue {
    id: string;
    venueId: string;
    venueName?: string;
    cityName?: string;
    venueCost?: number;
    professionalsCost?: number;
    totalCost?: number;
    dateAdded: Date;
    selectedProfessionalNames?: string[];
}

interface Professional {
    id: string;
    name: string;
    price: number;
    isFavorite: boolean;
    cityId: string;
}

const Favorites = () => {
    const [favorites, setFavorites] = useState<FavoriteVenue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                setLoading(true);
                // Buscar apenas locais marcados como favoritos
                const venuesRef = collection(db, 'venues');
                const q = query(venuesRef, where('isFavorite', '==', true));
                const favoritesSnapshot = await getDocs(q);

                if (favoritesSnapshot.empty) {
                    setFavorites([]);
                    setLoading(false);
                    return;
                }

                // Buscar todos os profissionais favoritos para incluir nos custos
                const professionalsRef = collection(db, 'professionals');
                const profQuery = query(professionalsRef, where('isFavorite', '==', true));
                const professionalsSnapshot = await getDocs(profQuery);

                const favoriteProfessionals = professionalsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Professional));

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

                        const totalCost = venueCost + professionalsCost;

                        const favorite = {
                            id: docSnap.id,
                            venueId: docSnap.id,
                            venueName: venueData.name,
                            venueCost: venueCost,
                            professionalsCost: professionalsCost,
                            totalCost: totalCost,
                            dateAdded: venueData.favoritedAt ? new Date(venueData.favoritedAt.seconds * 1000) : new Date(),
                            selectedProfessionalNames: cityProfessionals.map(p => p.name)
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
                setLoading(false);
            }
        };

        fetchFavorites();
    }, []);

    if (loading) {
        return <div className="loading">Carregando favoritos...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="favorites-container">
            <h2>Locais Favoritos</h2>

            {favorites.length === 0 ? (
                <div className="empty-state">
                    <p>Você ainda não possui locais favoritos.</p>
                    <p>Acesse o Planejamento de Locais e adicione locais aos favoritos!</p>
                </div>
            ) : (
                <div className="favorites-grid">
                    {favorites.map(favorite => (
                        <div key={favorite.id} className="favorite-card">
                            <h3>{favorite.venueName || 'Local não encontrado'}</h3>
                            <p className="city-name">{favorite.cityName || 'Cidade desconhecida'}</p>

                            {favorite.venueCost && (
                                <div className="cost-breakdown">
                                    <p className="venue-cost">
                                        <span>Custo do Local:</span>
                                        <span>R$ {favorite.venueCost.toLocaleString('pt-BR')}</span>
                                    </p>

                                    {(favorite.professionalsCost ?? 0) > 0 && (
                                        <>
                                            <p className="professionals-cost">
                                                <span>Custo de Profissionais:</span>
                                                <span>R$ {(favorite.professionalsCost ?? 0).toLocaleString('pt-BR')}</span>
                                            </p>

                                            <div className="professional-list">
                                                <p className="professional-list-title">Profissionais Incluídos:</p>
                                                <ul>
                                                    {favorite.selectedProfessionalNames?.map((name, index) => (
                                                        <li key={index}>{name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </>
                                    )}

                                    <p className="total-cost">
                                        <span>Custo Total Estimado:</span>
                                        <span>R$ {favorite.totalCost?.toLocaleString('pt-BR')}</span>
                                    </p>
                                </div>
                            )}

                            <p className="date-added">
                                Adicionado em: {favorite.dateAdded instanceof Date
                                    ? favorite.dateAdded.toLocaleDateString('pt-BR')
                                    : new Date(favorite.dateAdded).toLocaleDateString('pt-BR')
                                }
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Favorites;