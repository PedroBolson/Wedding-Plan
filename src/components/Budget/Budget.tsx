import { useState, useEffect, useContext } from "react";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import CountUp from "../common/CountUp";
import { useLoading } from "../../contexts/LoadingContext";
import { ThemeContext } from "../../contexts/ThemeContext";
import {
    DollarSign,
    Heart,
    Tag,
    MapPin,
    TrendingDown,
    TrendingUp,
    CheckCircle,
    Clock,
    FileText,
    Edit3,
    Trash2,
    X,
    Star,
    ChevronDown
} from "lucide-react";

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
    const { colors } = useContext(ThemeContext);
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
    const [inlineEditingField, setInlineEditingField] = useState<{ itemId: string; field: string } | null>(null);

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
            setBudgetItems(items =>
                items.map(item =>
                    item.id === isEditing
                        ? { ...item, [name]: parsedValue }
                        : item
                )
            );
        } else {
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

    const togglePaidStatus = async (item: BudgetItem) => {
        if (!item.id) return;

        try {
            setLoadingMessage("Atualizando status de pagamento...");
            setIsLoading(true);

            const newPaidStatus = !item.paid;
            const itemRef = doc(db, "budgetExtras", item.id);

            await updateDoc(itemRef, {
                paid: newPaidStatus
            });

            setBudgetItems(items =>
                items.map(i =>
                    i.id === item.id
                        ? { ...i, paid: newPaidStatus }
                        : i
                )
            );

            setError(null);
        } catch (error) {
            console.error("Erro ao atualizar status de pagamento:", error);
            setError("Erro ao atualizar status de pagamento.");
        } finally {
            setIsLoading(false);
        }
    };

    const updateActualCost = async (item: BudgetItem, newCost: number) => {
        if (!item.id) return;

        try {
            setLoadingMessage("Atualizando custo real...");
            setIsLoading(true);

            const itemRef = doc(db, "budgetExtras", item.id);

            await updateDoc(itemRef, {
                actualCost: newCost
            });

            setBudgetItems(items =>
                items.map(i =>
                    i.id === item.id
                        ? { ...i, actualCost: newCost }
                        : i
                )
            );

            setInlineEditingField(null);
            setError(null);
        } catch (error) {
            console.error("Erro ao atualizar custo real:", error);
            setError("Erro ao atualizar custo real.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInlineEdit = (itemId: string, field: string) => {
        setInlineEditingField({ itemId, field });
    };

    const handleInlineSubmit = (e: React.FormEvent, item: BudgetItem) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const newCost = parseFloat(formData.get('actualCost') as string) || 0;
        updateActualCost(item, newCost);
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
            <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-7 h-7" style={{ color: colors.primary }} />
                <h1 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style={{
                    backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                }}>
                    Orçamento de Itens Extras
                </h1>
            </div>
            <p className="mb-8 leading-relaxed" style={{ color: colors.textSecondary }}>
                Gerencie custos extras não incluídos nos serviços de locais ou profissionais contratados.
                Itens marcados como favoritos serão adicionados ao total na aba de Favoritos.
            </p>

            {error && (
                <div className="px-4 py-3 rounded-lg mb-6 border" style={{
                    backgroundColor: colors.error + '15',
                    borderColor: colors.error + '40',
                    color: colors.error
                }}>
                    <X className="inline-block w-4 h-4 mr-2" />
                    {error}
                </div>
            )}

            <div className="rounded-xl shadow-lg p-4 sm:p-6 mb-8 border transform hover:scale-105 transition-all duration-300" style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                background: `linear-gradient(135deg, ${colors.surface} 0%, ${colors.accent} 100%)`
            }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="text-center p-3 sm:p-4 rounded-lg" style={{ backgroundColor: colors.background }}>
                        <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center justify-center gap-2" style={{ color: colors.text }}>
                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                            Total Estimado
                        </h3>
                        <p className="text-2xl sm:text-3xl font-bold" style={{ color: colors.primary }}>
                            R$ <CountUp end={totalEstimated} className="inline" />
                        </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg" style={{ backgroundColor: colors.background }}>
                        <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center justify-center gap-2" style={{ color: colors.text }}>
                            {totalActual <= totalEstimated ? (
                                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.success }} />
                            ) : (
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: colors.error }} />
                            )}
                            Total Gasto (Real)
                        </h3>
                        <p className="text-2xl sm:text-3xl font-bold" style={{
                            color: totalActual <= totalEstimated ? colors.success : colors.error
                        }}>
                            R$ <CountUp end={totalActual} className="inline" />
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl shadow-lg border mb-8" style={{
                backgroundColor: colors.surface,
                borderColor: colors.border
            }}>
                <div
                    className="flex justify-between items-center p-6 cursor-pointer rounded-t-xl transition-all duration-200 hover:scale-[1.02]"
                    style={{
                        backgroundColor: isFormExpanded ? colors.accent : 'transparent',
                    }}
                    onClick={toggleFormExpansion}
                >
                    <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
                        Adicionar Novo Item Extra
                    </h2>
                    <button
                        className={`text-2xl font-bold transition-all duration-300 hover:scale-110 ${isFormExpanded ? 'rotate-180' : 'rotate-0'}`}
                        style={{ color: colors.primary }}
                        aria-label={isFormExpanded ? "Recolher formulário" : "Expandir formulário"}
                    >
                        <ChevronDown />
                    </button>
                </div>

                {isFormExpanded && (
                    <form className="p-4 sm:p-6 pt-0 border-t animate-in slide-in-from-top duration-300"
                        style={{ borderColor: colors.border }}
                        onSubmit={addBudgetItem}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="description">
                                    Descrição
                                </label>
                                <input
                                    className="w-full px-3 sm:px-4 py-2 border rounded-lg transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
                                    type="text"
                                    id="description"
                                    name="description"
                                    value={newItem.description}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="category">
                                    Categoria
                                </label>
                                <select
                                    className="w-full px-3 sm:px-4 py-2 border rounded-lg transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
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
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="cityId">
                                Cidade
                            </label>
                            <select
                                className="w-full px-3 sm:px-4 py-2 border rounded-lg transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                style={{
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="estimatedCost">
                                    Custo Estimado (R$)
                                </label>
                                <input
                                    className="w-full px-3 sm:px-4 py-2 border rounded-lg transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
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
                                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="actualCost">
                                    Custo Real (R$)
                                </label>
                                <input
                                    className="w-full px-3 sm:px-4 py-2 border rounded-lg transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    }}
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center">
                                <label className="flex items-center cursor-pointer hover:scale-105 transition-transform duration-200">
                                    <input
                                        className="w-4 h-4 rounded cursor-pointer"
                                        style={{
                                            accentColor: colors.primary,
                                        }}
                                        type="checkbox"
                                        name="paid"
                                        checked={newItem.paid}
                                        onChange={handleInputChange}
                                    />
                                    <span className="ml-2 text-sm font-medium" style={{ color: colors.text }}>
                                        Pago
                                    </span>
                                </label>
                            </div>

                            <div className="flex items-center">
                                <label className="flex items-center cursor-pointer hover:scale-105 transition-transform duration-200">
                                    <input
                                        className="w-4 h-4 rounded cursor-pointer"
                                        style={{
                                            accentColor: colors.primary,
                                        }}
                                        type="checkbox"
                                        name="isFavorite"
                                        checked={newItem.isFavorite}
                                        onChange={handleInputChange}
                                    />
                                    <span className="ml-2 text-sm font-medium" style={{ color: colors.text }}>
                                        Adicionar aos Favoritos
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="notes">
                                Observações
                            </label>
                            <textarea
                                className="w-full px-4 py-2 border rounded-lg resize-none transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                style={{
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
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
                            className="w-full font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                color: 'white',
                                boxShadow: isLoading ? 'none' : `0 4px 15px ${colors.primary}30`
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? "Adicionando..." : "Adicionar Item"}
                        </button>
                    </form>
                )}
            </div>

            <div className="rounded-xl shadow-lg border" style={{
                backgroundColor: colors.surface,
                borderColor: colors.border
            }}>
                <h2 className="text-lg sm:text-xl font-semibold p-4 sm:p-6 border-b" style={{
                    color: colors.text,
                    borderColor: colors.border
                }}>
                    Lista de Itens Extras
                </h2>

                <div className="p-4 sm:p-6 border-b" style={{ borderColor: colors.border }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="filterCategory">
                                Filtrar por categoria:
                            </label>
                            <select
                                className="w-full px-3 sm:px-4 py-2 border rounded-lg transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                style={{
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
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
                            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }} htmlFor="filterCity">
                                Filtrar por cidade:
                            </label>
                            <select
                                className="w-full px-3 sm:px-4 py-2 border rounded-lg transition-all duration-200 hover:scale-105 focus:scale-105 cursor-pointer"
                                style={{
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }}
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
                        <p className="text-center py-8" style={{ color: colors.textSecondary }}>
                            Nenhum item encontrado com os filtros atuais
                        </p>
                    </div>
                ) : (
                    <div className="p-4 sm:p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredItems.map(item => (
                            <div key={item.id}
                                className={`border rounded-xl p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${item.isFavorite ? 'ring-2' : ''}`}
                                style={{
                                    backgroundColor: item.paid ? colors.success + '10' : colors.surface,
                                    borderColor: item.paid ? colors.success : colors.border,
                                    outline: item.isFavorite ? `2px solid ${colors.warning}` : 'none',
                                    outlineOffset: item.isFavorite ? '2px' : '0'
                                }}>
                                {isEditing === item.id ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                                Descrição
                                            </label>
                                            <input
                                                className="w-full px-3 py-2 border rounded-md text-sm"
                                                style={{
                                                    backgroundColor: colors.background,
                                                    borderColor: colors.border,
                                                    color: colors.text,
                                                }}
                                                type="text"
                                                name="description"
                                                value={item.description}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1" style={{ color: colors.text }}>
                                                Categoria
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 border rounded-md text-sm"
                                                style={{
                                                    backgroundColor: colors.background,
                                                    borderColor: colors.border,
                                                    color: colors.text,
                                                }}
                                                name="category"
                                                value={item.category}
                                                onChange={handleInputChange}
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                                            <button
                                                className="flex-1 text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 hover:scale-105"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                    color: 'white'
                                                }}
                                                onClick={() => saveEdit(item.id!)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? "Salvando..." : "Salvar"}
                                            </button>
                                            <button
                                                className="flex-1 text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 hover:scale-105"
                                                style={{
                                                    backgroundColor: colors.textSecondary + '20',
                                                    color: colors.text
                                                }}
                                                onClick={cancelEditing}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Header do Card */}
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="text-lg font-semibold flex-1" style={{ color: colors.text }}>
                                                {item.description}
                                            </h3>
                                            <button
                                                className="ml-2 p-1 rounded-full transition-all duration-200 hover:scale-110"
                                                style={{
                                                    color: item.isFavorite ? '#ef4444' : colors.textSecondary,
                                                    backgroundColor: colors.background
                                                }}
                                                onClick={() => toggleFavorite(item)}
                                                aria-label={item.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                            >
                                                <Heart className={`w-5 h-5 ${item.isFavorite ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>

                                        {/* Informações principais */}
                                        <div className="space-y-2 mb-3 text-sm" style={{ color: colors.textSecondary }}>
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1">
                                                    <Tag className="w-3 h-3" />
                                                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {getCityName(item.cityId)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    Est: R$ {item.estimatedCost.toFixed(2)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {item.actualCost <= item.estimatedCost ? (
                                                        <TrendingDown className="w-3 h-3" style={{ color: colors.success }} />
                                                    ) : (
                                                        <TrendingUp className="w-3 h-3" style={{ color: colors.error }} />
                                                    )}
                                                    {inlineEditingField?.itemId === item.id && inlineEditingField?.field === 'actualCost' ? (
                                                        <form onSubmit={(e) => handleInlineSubmit(e, item)} className="flex items-center gap-1">
                                                            <input
                                                                name="actualCost"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                defaultValue={item.actualCost}
                                                                className="w-16 px-1 py-0 text-xs border rounded"
                                                                style={{
                                                                    backgroundColor: colors.background,
                                                                    borderColor: colors.border,
                                                                    color: colors.text,
                                                                }}
                                                                autoFocus
                                                                onBlur={() => setInlineEditingField(null)}
                                                            />
                                                        </form>
                                                    ) : (
                                                        <span
                                                            className="cursor-pointer hover:underline"
                                                            style={{
                                                                color: item.actualCost <= item.estimatedCost ? colors.success : colors.error
                                                            }}
                                                            onClick={() => handleInlineEdit(item.id!, 'actualCost')}
                                                        >
                                                            Real: R$ {item.actualCost.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status e badges */}
                                        <div className="flex items-center justify-between mb-3">
                                            <button
                                                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 hover:scale-105`}
                                                style={{
                                                    backgroundColor: item.paid ? colors.success : 'transparent',
                                                    color: item.paid ? 'white' : colors.warning,
                                                    border: `1px solid ${item.paid ? colors.success : colors.warning}`
                                                }}
                                                onClick={() => togglePaidStatus(item)}
                                            >
                                                {item.paid ? (
                                                    <>
                                                        <CheckCircle className="inline-block w-3 h-3 mr-1" />
                                                        Pago
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="inline-block w-3 h-3 mr-1" />
                                                        Pendente
                                                    </>
                                                )}
                                            </button>

                                            {item.isFavorite && (
                                                <span className="px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1"
                                                    style={{ backgroundColor: colors.warning }}>
                                                    <Star className="w-3 h-3" />
                                                    Favorito
                                                </span>
                                            )}
                                        </div>

                                        {/* Observações */}
                                        {item.notes && (
                                            <div className="mb-3 p-2 rounded" style={{ backgroundColor: colors.background }}>
                                                <p className="text-xs flex items-start gap-1" style={{ color: colors.text }}>
                                                    <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                    <span>{item.notes}</span>
                                                </p>
                                            </div>
                                        )}

                                        {/* Botões de ação */}
                                        <div className="flex gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                                            <button
                                                className="flex-1 text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 hover:scale-105"
                                                style={{
                                                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                                                    color: 'white'
                                                }}
                                                onClick={() => startEditing(item)}
                                                disabled={isLoading}
                                            >
                                                <Edit3 className="inline-block w-3 h-3 mr-1" />
                                                Editar
                                            </button>
                                            <button
                                                className="text-sm font-semibold py-2 px-3 rounded-md transition-all duration-200 hover:scale-105"
                                                style={{
                                                    backgroundColor: colors.error,
                                                    color: 'white'
                                                }}
                                                onClick={() => handleDeleteConfirmation(item.id!)}
                                                disabled={isLoading}
                                            >
                                                <Trash2 className="inline-block w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Modal de confirmação de exclusão */}
                                        {confirmDelete === item.id && (
                                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                                <div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-4" style={{ backgroundColor: colors.surface }}>
                                                    <p className="mb-4" style={{ color: colors.text }}>
                                                        Tem certeza que deseja excluir este item?
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="flex-1 font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105"
                                                            style={{
                                                                backgroundColor: colors.error,
                                                                color: 'white'
                                                            }}
                                                            onClick={() => deleteBudgetItem(item.id!)}
                                                            disabled={isLoading}
                                                        >
                                                            <Trash2 className="inline-block w-4 h-4 mr-1" />
                                                            Sim, Excluir
                                                        </button>
                                                        <button
                                                            className="flex-1 font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105"
                                                            style={{
                                                                backgroundColor: colors.textSecondary + '20',
                                                                color: colors.text
                                                            }}
                                                            onClick={() => setConfirmDelete(null)}
                                                        >
                                                            <X className="inline-block w-4 h-4 mr-1" />
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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