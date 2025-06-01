import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import CountUp from "../common/CountUp";
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
        <div className="max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">Orçamento de Itens Extras</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                Gerencie custos extras não incluídos nos serviços de locais ou profissionais contratados.
                Itens marcados como favoritos serão adicionados ao total na aba de Favoritos.
            </p>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Total Estimado</h3>
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                            R$ <CountUp end={totalEstimated} className="inline" />
                        </p>
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Total Gasto (Real)</h3>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                            R$ <CountUp end={totalActual} className="inline" />
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
                <div
                    className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
                    onClick={toggleFormExpansion}
                >
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Adicionar Novo Item Extra</h2>
                    <button
                        className={`text-2xl font-bold text-indigo-600 dark:text-indigo-400 transition-transform duration-300 ${isFormExpanded ? 'rotate-180' : ''}`}
                        aria-label={isFormExpanded ? "Recolher formulário" : "Expandir formulário"}
                    >
                        {isFormExpanded ? '−' : '+'}
                    </button>
                </div>

                {isFormExpanded && (
                    <form className="p-6 pt-0 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top duration-300" onSubmit={addBudgetItem}>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="description">Descrição</label>
                                <input
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    type="text"
                                    id="description"
                                    name="description"
                                    value={newItem.description}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="category">Categoria</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="cityId">Cidade</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="estimatedCost">Custo Estimado (R$)</label>
                                <input
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="actualCost">Custo Real (R$)</label>
                                <input
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        type="checkbox"
                                        name="paid"
                                        checked={newItem.paid}
                                        onChange={handleInputChange}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Pago</span>
                                </label>
                            </div>

                            <div className="flex items-center">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                        type="checkbox"
                                        name="isFavorite"
                                        checked={newItem.isFavorite}
                                        onChange={handleInputChange}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Adicionar aos Favoritos</span>
                                </label>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="notes">Observações</label>
                            <textarea
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                                id="notes"
                                name="notes"
                                rows={3}
                                value={newItem.notes}
                                onChange={handleInputChange}
                                placeholder="Detalhes adicionais sobre este item"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? "Adicionando..." : "Adicionar Item"}
                        </button>
                    </form>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 p-6 border-b border-gray-200 dark:border-gray-700">Lista de Itens Extras</h2>

                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="filterCategory">Filtrar por categoria:</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="filterCity">Filtrar por cidade:</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                </div>

                {filteredItems.length === 0 ? (
                    <div className="p-6">
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item encontrado com os filtros atuais.</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        {filteredItems.map(item => (
                            <div key={item.id} className={`border rounded-lg p-6 transition-all duration-200 ${item.paid
                                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                } ${item.isFavorite
                                    ? 'ring-2 ring-yellow-300 dark:ring-yellow-600'
                                    : ''
                                }`}>
                                {isEditing === item.id ? (
                                    // Formulário de edição
                                    <div className="space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
                                                <input
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                    type="text"
                                                    name="description"
                                                    value={item.description}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                                                <select
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cidade</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custo Estimado (R$)</label>
                                                <input
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                    type="number"
                                                    name="estimatedCost"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.estimatedCost}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custo Real (R$)</label>
                                                <input
                                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                                    type="number"
                                                    name="actualCost"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.actualCost}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="flex items-center">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                        type="checkbox"
                                                        name="paid"
                                                        checked={item.paid}
                                                        onChange={handleInputChange}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Pago</span>
                                                </label>
                                            </div>

                                            <div className="flex items-center">
                                                <label className="flex items-center cursor-pointer">
                                                    <input
                                                        className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                        type="checkbox"
                                                        name="isFavorite"
                                                        checked={item.isFavorite}
                                                        onChange={handleInputChange}
                                                    />
                                                    <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Adicionar aos Favoritos</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observações</label>
                                            <textarea
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                                                name="notes"
                                                rows={3}
                                                value={item.notes}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-4">
                                            <button
                                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => saveEdit(item.id!)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? "Salvando..." : "Salvar"}
                                            </button>
                                            <button
                                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.description}</h3>
                                            <button
                                                className={`text-2xl transition-colors duration-200 hover:scale-110 ${item.isFavorite
                                                        ? 'text-yellow-500 dark:text-yellow-400'
                                                        : 'text-gray-400 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400'
                                                    }`}
                                                onClick={() => toggleFavorite(item)}
                                                aria-label={item.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                                disabled={isLoading}
                                            >
                                                {item.isFavorite ? '★' : '☆'}
                                            </button>
                                        </div>

                                        <div className="flex gap-2 mb-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                {item.category}
                                            </span>
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                {getCityName(item.cityId)}
                                            </span>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">Estimado:</span> R$ {item.estimatedCost.toFixed(2)}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">Real:</span> R$ {item.actualCost.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${item.paid
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    }`}>
                                                    {item.paid ? 'Pago' : 'Pendente'}
                                                </span>
                                            </div>
                                        </div>

                                        {item.notes && (
                                            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">Observações:</span> {item.notes}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => startEditing(item)}
                                                disabled={isLoading}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => handleDeleteConfirmation(item.id!)}
                                                disabled={isLoading}
                                            >
                                                Excluir
                                            </button>

                                            {confirmDelete === item.id && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
                                                        <p className="text-gray-900 dark:text-gray-100 mb-4">Tem certeza que deseja excluir este item?</p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                onClick={() => deleteBudgetItem(item.id!)}
                                                                disabled={isLoading}
                                                            >
                                                                Sim
                                                            </button>
                                                            <button
                                                                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                onClick={() => setConfirmDelete(null)}
                                                                disabled={isLoading}
                                                            >
                                                                Não
                                                            </button>
                                                        </div>
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