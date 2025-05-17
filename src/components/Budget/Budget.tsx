import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import CountUp from "../common/CountUp";
import "./Budget.css";
import { useLoading } from "../../contexts/LoadingContext";

interface BudgetItem {
    id?: string;
    description: string;
    category: string;
    cityId: string;
    estimatedCost: number;
    actualCost: number;
    paid: boolean;
    notes: string;
    isFavorite: boolean;
    userId: string;
    createdAt?: Date;
}

interface City {
    id: string;
    name: string;
    state: string;
}

const Budget = () => {
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [newItem, setNewItem] = useState<BudgetItem>({
        description: "",
        category: "decoração",
        cityId: "",
        estimatedCost: 0,
        actualCost: 0,
        paid: false,
        notes: "",
        isFavorite: false,
        userId: ""
    });
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [totalEstimated, setTotalEstimated] = useState(0);
    const [totalActual, setTotalActual] = useState(0);
    const [filterCategory, setFilterCategory] = useState<string>("todas");
    const [filterCity, setFilterCity] = useState<string>("todas");
    const [error, setError] = useState<string | null>(null);
    const [isFormExpanded, setIsFormExpanded] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const { isLoading, setIsLoading, setLoadingMessage } = useLoading();

    const categories = [
        "decoração",
        "lembranças",
        "vestido",
        "traje noivo",
        "alianças",
        "convites",
        "beleza",
        "transporte",
        "lua de mel",
        "outro"
    ];

    useEffect(() => {
        fetchCities();
        fetchBudgetItems();
    }, []);

    // Calcular totais quando os itens mudarem
    useEffect(() => {
        calculateTotals();
    }, [budgetItems, filterCity, filterCategory]);

    const calculateTotals = () => {
        const filteredItems = getFilteredItems();
        const estimated = filteredItems.reduce((acc, item) => acc + item.estimatedCost, 0);
        const actual = filteredItems.reduce((acc, item) => acc + item.actualCost, 0);

        setTotalEstimated(estimated);
        setTotalActual(actual);
    };

    const fetchCities = async () => {
        try {
            setLoadingMessage("Carregando cidades...");
            setIsLoading(true);

            const citiesCollection = collection(db, "cities");
            const citiesSnapshot = await getDocs(citiesCollection);
            const citiesList = citiesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            })) as City[];

            setCities(citiesList);
        } catch (error) {
            console.error("Erro ao buscar cidades:", error);
            setError("Não foi possível carregar as cidades.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBudgetItems = async () => {
        try {
            setLoadingMessage("Carregando orçamento...");
            setIsLoading(true);

            const budgetCollection = collection(db, "budgetExtras");
            const budgetSnapshot = await getDocs(budgetCollection);
            const items = budgetSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
            })) as BudgetItem[];

            setBudgetItems(items);
        } catch (error) {
            console.error("Erro ao buscar dados de orçamento:", error);
            setError("Erro ao buscar itens de orçamento. Tente novamente mais tarde.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: any = value;

        if (type === "number") {
            parsedValue = parseFloat(value) || 0;
        } else if (type === "checkbox") {
            parsedValue = (e.target as HTMLInputElement).checked;
        }

        if (isEditing) {
            // Se estiver editando, atualize o item específico
            setBudgetItems(items =>
                items.map(item =>
                    item.id === isEditing
                        ? { ...item, [name]: parsedValue }
                        : item
                )
            );
        } else {
            // Se estiver criando um novo item
            setNewItem(prev => ({ ...prev, [name]: parsedValue }));
        }
    };

    const addBudgetItem = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newItem.cityId) {
            setError("Por favor, selecione uma cidade.");
            return;
        }

        try {
            setLoadingMessage("Adicionando novo item...");
            setIsLoading(true);

            const budgetCollection = collection(db, "budgetExtras");
            const itemToAdd = {
                ...newItem,
                userId: auth.currentUser?.uid,
            };

            await addDoc(budgetCollection, itemToAdd);

            setNewItem({
                description: "",
                category: "decoração",
                cityId: newItem.cityId,
                estimatedCost: 0,
                actualCost: 0,
                paid: false,
                notes: "",
                isFavorite: false,
                userId: ""
            });

            await fetchBudgetItems();
            setError(null);
        } catch (error) {
            console.error("Erro ao adicionar item:", error);
            setError("Erro ao adicionar item. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const startEditing = (item: BudgetItem) => {
        setIsEditing(item.id || null);
        setError(null);
    };

    const cancelEditing = () => {
        setIsEditing(null);
        fetchBudgetItems();
    };

    const saveEdit = async (id: string) => {
        try {
            setLoadingMessage("Salvando alterações...");
            setIsLoading(true);

            const itemToUpdate = budgetItems.find(item => item.id === id);
            if (itemToUpdate && id) {
                const itemRef = doc(db, "budgetExtras", id);
                const { id: _, createdAt, ...itemData } = itemToUpdate;
                await updateDoc(itemRef, itemData);
                setIsEditing(null);
                await fetchBudgetItems();
                setError(null);
            }
        } catch (error) {
            console.error("Erro ao atualizar item:", error);
            setError("Erro ao atualizar item. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConfirmation = (id: string) => {
        setConfirmDelete(id);
    };

    const deleteBudgetItem = async (id: string) => {
        try {
            setLoadingMessage("Excluindo item...");
            setIsLoading(true);

            const itemRef = doc(db, "budgetExtras", id);
            await deleteDoc(itemRef);
            await fetchBudgetItems();
            setError(null);
            setConfirmDelete(null);
        } catch (error) {
            console.error("Erro ao excluir item:", error);
            setError("Erro ao excluir item. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFavorite = async (item: BudgetItem) => {
        if (!item.id) return;

        try {
            setLoadingMessage("Atualizando favorito...");
            setIsLoading(true);

            const newFavoriteStatus = !item.isFavorite;
            const itemRef = doc(db, "budgetExtras", item.id);

            await updateDoc(itemRef, {
                isFavorite: newFavoriteStatus
            });

            setBudgetItems(items =>
                items.map(i =>
                    i.id === item.id
                        ? { ...i, isFavorite: newFavoriteStatus }
                        : i
                )
            );

            setError(null);
        } catch (error) {
            console.error("Erro ao atualizar favorito:", error);
            setError("Erro ao marcar/desmarcar como favorito.");
        } finally {
            setIsLoading(false);
        }
    };

    const getFilteredItems = () => {
        return budgetItems.filter(item => {
            const matchesCategory = filterCategory === "todas" || item.category === filterCategory;
            const matchesCity = filterCity === "todas" || item.cityId === filterCity;
            return matchesCategory && matchesCity;
        });
    };

    const toggleFormExpansion = () => {
        setIsFormExpanded(prev => !prev);
    };

    const filteredItems = getFilteredItems();

    const getCityName = (cityId: string) => {
        const city = cities.find(city => city.id === cityId);
        return city ? city.name : "Cidade não encontrada";
    };
    return (
        <div className="budget-container">
            <h1 className="budget-title">Orçamento de Itens Extras</h1>
            <p className="budget-subtitle">
                Gerencie custos extras não incluídos nos serviços de locais ou profissionais contratados.
                Itens marcados como favoritos serão adicionados ao total na aba de Favoritos.
            </p>

            {error && <div className="budget-error">{error}</div>}

            <div className="budget-summary">
                <div className="budget-summary-item">
                    <h3 className="budget-summary-heading">Total Estimado</h3>
                    <p className="budget-amount estimated">
                        R$ <CountUp end={totalEstimated} className="budget-counter" />
                    </p>
                </div>
                <div className="budget-summary-item">
                    <h3 className="budget-summary-heading">Total Gasto (Real)</h3>
                    <p className="budget-amount actual">
                        R$ <CountUp end={totalActual} className="budget-counter" />
                    </p>
                </div>
            </div>

            <div className="budget-form-container">
                <div className="budget-form-header" onClick={toggleFormExpansion}>
                    <h2 className="budget-form-title">Adicionar Novo Item Extra</h2>
                    <button
                        className={`budget-form-toggle ${isFormExpanded ? 'expanded' : ''}`}
                        aria-label={isFormExpanded ? "Recolher formulário" : "Expandir formulário"}
                    >
                        {isFormExpanded ? '−' : '+'}
                    </button>
                </div>

                {isFormExpanded && (
                    <form className="budget-form" onSubmit={addBudgetItem}>
                        <div className="budget-form-row">
                            <div className="budget-form-group">
                                <label className="budget-label" htmlFor="description">Descrição</label>
                                <input
                                    className="budget-input"
                                    type="text"
                                    id="description"
                                    name="description"
                                    value={newItem.description}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="budget-form-group">
                                <label className="budget-label" htmlFor="category">Categoria</label>
                                <select
                                    className="budget-select"
                                    id="category"
                                    name="category"
                                    value={newItem.category}
                                    onChange={handleInputChange}
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="budget-form-row">
                            <div className="budget-form-group">
                                <label className="budget-label" htmlFor="cityId">Cidade</label>
                                <select
                                    className="budget-select"
                                    id="cityId"
                                    name="cityId"
                                    value={newItem.cityId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Selecione uma cidade</option>
                                    {cities.map(city => (
                                        <option key={city.id} value={city.id}>{city.name} - {city.state}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="budget-form-row">
                            <div className="budget-form-group">
                                <label className="budget-label" htmlFor="estimatedCost">Custo Estimado (R$)</label>
                                <input
                                    className="budget-input"
                                    type="number"
                                    id="estimatedCost"
                                    name="estimatedCost"
                                    min="0"
                                    step="0.01"
                                    value={newItem.estimatedCost}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="budget-form-group">
                                <label className="budget-label" htmlFor="actualCost">Custo Real (R$)</label>
                                <input
                                    className="budget-input"
                                    type="number"
                                    id="actualCost"
                                    name="actualCost"
                                    min="0"
                                    step="0.01"
                                    value={newItem.actualCost}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="budget-form-row">
                            <div className="budget-form-group budget-checkbox-group">
                                <label className="budget-checkbox-label">
                                    <input
                                        className="budget-checkbox"
                                        type="checkbox"
                                        name="paid"
                                        checked={newItem.paid}
                                        onChange={handleInputChange}
                                    />
                                    Pago
                                </label>
                            </div>

                            <div className="budget-form-group budget-checkbox-group">
                                <label className="budget-checkbox-label">
                                    <input
                                        className="budget-checkbox"
                                        type="checkbox"
                                        name="isFavorite"
                                        checked={newItem.isFavorite}
                                        onChange={handleInputChange}
                                    />
                                    Adicionar aos Favoritos
                                </label>
                            </div>
                        </div>

                        <div className="budget-form-group">
                            <label className="budget-label" htmlFor="notes">Observações</label>
                            <textarea
                                className="budget-textarea"
                                id="notes"
                                name="notes"
                                value={newItem.notes}
                                onChange={handleInputChange}
                                placeholder="Detalhes adicionais sobre este item"
                            />
                        </div>

                        <button
                            type="submit"
                            className="budget-add-button"
                            disabled={isLoading}
                        >
                            {isLoading ? "Adicionando..." : "Adicionar Item"}
                        </button>
                    </form>
                )}
            </div>

            <div className="budget-list-container">
                <h2 className="budget-list-title">Lista de Itens Extras</h2>

                <div className="budget-filters">
                    <div className="budget-filter-container">
                        <label className="budget-filter-label" htmlFor="filterCategory">Filtrar por categoria:</label>
                        <select
                            className="budget-filter-select"
                            id="filterCategory"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="todas">Todas</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="budget-filter-container">
                        <label className="budget-filter-label" htmlFor="filterCity">Filtrar por cidade:</label>
                        <select
                            className="budget-filter-select"
                            id="filterCity"
                            value={filterCity}
                            onChange={(e) => setFilterCity(e.target.value)}
                        >
                            <option value="todas">Todas</option>
                            {cities.map(city => (
                                <option key={city.id} value={city.id}>{city.name} - {city.state}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredItems.length === 0 ? (
                    <p className="budget-no-items">Nenhum item encontrado com os filtros atuais.</p>
                ) : (
                    <div className="budget-items-list">
                        {filteredItems.map(item => (
                            <div key={item.id} className={`budget-item ${item.paid ? 'budget-item-paid' : ''} ${item.isFavorite ? 'budget-item-favorite' : ''}`}>
                                {isEditing === item.id ? (
                                    // Formulário de edição
                                    <div className="budget-editing-form">
                                        <div className="budget-form-row">
                                            <div className="budget-form-group">
                                                <label className="budget-label">Descrição</label>
                                                <input
                                                    className="budget-input"
                                                    type="text"
                                                    name="description"
                                                    value={item.description}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                            <div className="budget-form-group">
                                                <label className="budget-label">Categoria</label>
                                                <select
                                                    className="budget-select"
                                                    name="category"
                                                    value={item.category}
                                                    onChange={handleInputChange}
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="budget-form-group">
                                            <label className="budget-label">Cidade</label>
                                            <select
                                                className="budget-select"
                                                name="cityId"
                                                value={item.cityId}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Selecione uma cidade</option>
                                                {cities.map(city => (
                                                    <option key={city.id} value={city.id}>{city.name} - {city.state}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="budget-form-row">
                                            <div className="budget-form-group">
                                                <label className="budget-label">Custo Estimado (R$)</label>
                                                <input
                                                    className="budget-input"
                                                    type="number"
                                                    name="estimatedCost"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.estimatedCost}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                            <div className="budget-form-group">
                                                <label className="budget-label">Custo Real (R$)</label>
                                                <input
                                                    className="budget-input"
                                                    type="number"
                                                    name="actualCost"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.actualCost}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="budget-form-row">
                                            <div className="budget-form-group budget-checkbox-group">
                                                <label className="budget-checkbox-label">
                                                    <input
                                                        className="budget-checkbox"
                                                        type="checkbox"
                                                        name="paid"
                                                        checked={item.paid}
                                                        onChange={handleInputChange}
                                                    />
                                                    Pago
                                                </label>
                                            </div>

                                            <div className="budget-form-group budget-checkbox-group">
                                                <label className="budget-checkbox-label">
                                                    <input
                                                        className="budget-checkbox"
                                                        type="checkbox"
                                                        name="isFavorite"
                                                        checked={item.isFavorite}
                                                        onChange={handleInputChange}
                                                    />
                                                    Adicionar aos Favoritos
                                                </label>
                                            </div>
                                        </div>

                                        <div className="budget-form-group">
                                            <label className="budget-label">Observações</label>
                                            <textarea
                                                className="budget-textarea"
                                                name="notes"
                                                value={item.notes}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="budget-edit-actions">
                                            <button
                                                className="budget-save-button"
                                                onClick={() => saveEdit(item.id!)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? "Salvando..." : "Salvar"}
                                            </button>
                                            <button
                                                className="budget-cancel-button"
                                                onClick={cancelEditing}
                                                disabled={isLoading}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Visualização normal
                                    <>
                                        <div className="budget-item-header">
                                            <h3 className="budget-item-title">{item.description}</h3>
                                            <button
                                                className={`budget-favorite-toggle ${item.isFavorite ? 'is-favorite' : ''}`}
                                                onClick={() => toggleFavorite(item)}
                                                aria-label={item.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                                disabled={isLoading}
                                            >
                                                {item.isFavorite ? '★' : '☆'}
                                            </button>
                                        </div>

                                        <div className="budget-item-meta">
                                            <span className="budget-category-tag">{item.category}</span>
                                            <span className="budget-city-tag">{getCityName(item.cityId)}</span>
                                        </div>

                                        <div className="budget-item-details">
                                            <div className="budget-cost-details">
                                                <p className="budget-cost-item"><strong>Estimado:</strong> R$ {item.estimatedCost.toFixed(2)}</p>
                                                <p className="budget-cost-item"><strong>Real:</strong> R$ {item.actualCost.toFixed(2)}</p>
                                            </div>
                                            <div className="budget-item-status">
                                                <p className={`budget-status-tag ${item.paid ? 'budget-status-paid' : 'budget-status-pending'}`}>
                                                    {item.paid ? 'Pago' : 'Pendente'}
                                                </p>
                                            </div>
                                        </div>

                                        {item.notes && (
                                            <div className="budget-item-notes">
                                                <p className="budget-notes-text"><strong>Observações:</strong> {item.notes}</p>
                                            </div>
                                        )}

                                        <div className="budget-item-actions">
                                            <button
                                                className="budget-edit-button"
                                                onClick={() => startEditing(item)}
                                                disabled={isLoading}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="budget-delete-button"
                                                onClick={() => handleDeleteConfirmation(item.id!)}
                                                disabled={isLoading}
                                            >
                                                Excluir
                                            </button>

                                            {confirmDelete === item.id && (
                                                <div className="budget-confirm-delete">
                                                    <p>Tem certeza que deseja excluir este item?</p>
                                                    <div className="budget-confirm-buttons">
                                                        <button
                                                            className="budget-confirm-yes"
                                                            onClick={() => deleteBudgetItem(item.id!)}
                                                            disabled={isLoading}
                                                        >
                                                            Sim
                                                        </button>
                                                        <button
                                                            className="budget-confirm-no"
                                                            onClick={() => setConfirmDelete(null)}
                                                            disabled={isLoading}
                                                        >
                                                            Não
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Budget;