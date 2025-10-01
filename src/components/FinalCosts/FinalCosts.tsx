import { useState, useEffect, useContext } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from "firebase/firestore";
import { db, auth } from "../../firebase/config";
import { useLoading } from "../../contexts/LoadingContext";
import { Pie, Doughnut } from 'react-chartjs-2';
import CountUp from '../common/CountUp';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { DollarSign, CheckCircle, Clock, Trash2, Edit3, X, Layers, BarChart3 } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

// Helper seguro para gerar UUID evitando crash em browsers sem crypto.randomUUID
const safeUUID = (): string => {
    try {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return (crypto as any).randomUUID();
        }
    } catch (_) { /* ignore */ }
    // fallback
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

interface PaymentEntry {
    id: string; // local UUID
    label: string; // Ex: "Entrada", "Parcela 1", "Saldo Final"
    dueDate?: string; // ISO date (yyyy-mm-dd)
    amount: number;
    paid: boolean;
    paidAt?: string; // ISO date
    method?: string; // pix | cartao | boleto | transferencia | dinheiro | cheque | outro
    notes?: string;
}

interface FinalCostItem {
    id?: string;
    description: string;
    category: string;
    amount: number; // valor total final (pode incluir descontos) – mantido por retrocompatibilidade
    paid: boolean; // continua como atalho (true se tudo pago)
    notes: string;
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string;
    // NOVOS CAMPOS
    totalAgreed?: number; // valor contratado original antes de descontos
    discountValue?: number; // desconto em valor
    discountPercent?: number; // desconto em % (informativo)
    paymentPlanType?: 'single' | 'installments' | 'milestones';
    payments?: PaymentEntry[]; // detalhamento
    contractRef?: string; // url ou id de contrato
    isVenue?: boolean; // identifica item especial do local escolhido
}

interface ChosenVenueData {
    id: string;
    name: string;
    cityId: string;
    venuePrice: number;
    foodPrice: number;
    drinkPrice: number;
}

const categoriesBase = [
    "local",
    "decoração",
    "alimentação",
    "bebidas",
    "música",
    "foto e vídeo",
    "cerimônia",
    "trajes",
    "lua de mel",
    "transporte",
    "contratos",
    "outros"
];

const FinalCosts = () => {
    const { colors } = useContext(ThemeContext);
    const { isLoading, setIsLoading, setLoadingMessage } = useLoading();
    const [items, setItems] = useState<FinalCostItem[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [chosenVenue, setChosenVenue] = useState<ChosenVenueData | null>(null);
    // Removido formulário separado: criação agora é inline via draft card
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [viewChart, setViewChart] = useState<'categories' | 'paid'>('categories');
    const [paymentsModalItem, setPaymentsModalItem] = useState<FinalCostItem | null>(null);

    useEffect(() => {
        fetchChosenVenue();
        fetchItems();
    }, []);

    const fetchChosenVenue = async () => {
        try {
            setLoadingMessage("Carregando local escolhido...");
            setIsLoading(true);
            const venuesRef = collection(db, 'venues');
            const q = query(venuesRef, where('isChosen', '==', true));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const d = snap.docs[0];
                const data = d.data() as any;
                setChosenVenue({
                    id: d.id,
                    name: data.name,
                    cityId: data.cityId,
                    venuePrice: data.venuePrice || 0,
                    foodPrice: data.foodPrice || 0,
                    drinkPrice: data.drinkPrice || 0
                });
            } else {
                setChosenVenue(null);
            }
        } catch (e) {
            console.error(e);
            setError("Não foi possível carregar o local escolhido.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchItems = async () => {
        try {
            setLoadingMessage("Carregando custos definitivos...");
            setIsLoading(true);
            const refCol = collection(db, 'finalCosts');
            const snap = await getDocs(refCol);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FinalCostItem[];
            setItems(list);
        } catch (e) {
            console.error(e);
            setError("Erro ao carregar custos definitivos.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingId) return; // só edita cards em modo edição
        const { name, value, type, checked } = e.target as any;
        const numeric = ['amount', 'totalAgreed', 'discountValue', 'discountPercent'];
        const val = type === 'checkbox' ? checked : (numeric.includes(name) ? parseFloat(value) || 0 : value);
        setItems(prev => prev.map(it => it.id === editingId ? { ...it, [name]: val } : it));
    };

    const createDraftCost = () => {
        if (!chosenVenue) return;
        const existing = items.find(i => (i.id || '').startsWith('draft-'));
        if (existing) { setEditingId(existing.id!); return; }
        const uid = auth.currentUser?.uid;
        const draft: FinalCostItem = {
            id: 'draft-' + safeUUID(),
            description: '',
            category: 'outros',
            amount: 0,
            paid: false,
            notes: '',
            totalAgreed: 0,
            discountValue: 0,
            paymentPlanType: 'single',
            payments: [],
            userId: uid
        };
        setItems(prev => [draft, ...prev]);
        setEditingId(draft.id!);
    };

    const saveEdit = async (id: string) => {
        try {
            setLoadingMessage("Salvando alterações...");
            setIsLoading(true);
            const item = items.find(i => i.id === id);
            if (!item) return;
            const { id: _, createdAt, userId, payments = [], totalAgreed, discountValue, discountPercent, isVenue, ...rest } = item as any;
            // Montantes: Valor Final = Total Contratado - Desconto (independente das parcelas)
            const totalFromPayments = payments.reduce((a: number, p: PaymentEntry) => a + (p.amount || 0), 0);
            const agreed = (typeof totalAgreed === 'number' ? totalAgreed : totalFromPayments) || 0;
            const effectiveDiscount = discountValue || 0;
            const finalValue = Math.max(0, agreed - effectiveDiscount);
            const allPaid = payments.length > 0 && payments.every((p: PaymentEntry) => p.paid);
            // Sanitiza pagamentos removendo campos undefined (Firestore não aceita undefined)
            const cleanPayments = payments.map((p: PaymentEntry) => {
                const base: any = { id: p.id, label: p.label, amount: p.amount, paid: p.paid };
                if (p.dueDate) base.dueDate = p.dueDate;
                if (p.paidAt) base.paidAt = p.paidAt;
                if (p.method) base.method = p.method;
                if (p.notes) base.notes = p.notes;
                return base;
            });
            const uid = auth.currentUser?.uid;
            const payload = {
                ...rest,
                totalAgreed: agreed,
                amount: finalValue,
                discountValue: effectiveDiscount || null,
                discountPercent: discountPercent || null,
                payments: cleanPayments,
                paid: allPaid,
                userId: userId || uid || null,
                isVenue: !!isVenue,
                updatedAt: new Date()
            };
            // Remove explicit undefined (defensivo)
            Object.keys(payload).forEach(k => (payload as any)[k] === undefined && delete (payload as any)[k]);
            if (id === 'local-draft' || id.startsWith('draft-')) {
                // Criar novo documento para o local
                await addDoc(collection(db, 'finalCosts'), payload);
            } else {
                await updateDoc(doc(db, 'finalCosts', id), payload);
            }
            setEditingId(null);
            fetchItems();
        } catch (e) {
            console.error(e);
            setError("Erro ao salvar alterações.");
        } finally {
            setIsLoading(false);
        }
    };

    // ----- Gestão de pagamentos detalhados -----
    // Modal helpers
    const closePaymentsModal = () => setPaymentsModalItem(null);

    const ensurePaymentsStructure = (id: string) => {
        setItems(prev => prev.map(it => {
            if (it.id !== id) return it;
            if (!it.payments || it.payments.length === 0) {
                return {
                    ...it,
                    paymentPlanType: 'single',
                    payments: [{ id: safeUUID(), label: 'Pagamento Único', amount: it.amount, paid: it.paid, method: 'pix' }]
                };
            }
            return it;
        }));
    };

    const addPayment = (id: string) => {
        setItems(prev => prev.map(it => it.id === id ? {
            ...it,
            paymentPlanType: it.paymentPlanType === 'single' ? 'installments' : (it.paymentPlanType || 'installments'),
            payments: [...(it.payments || []), { id: safeUUID(), label: `Parcela ${(it.payments?.length || 0) + 1}`, amount: 0, paid: false, method: 'pix' }]
        } : it));
    };

    const updatePaymentField = (itemId: string, paymentId: string, field: keyof PaymentEntry, value: any) => {
        setItems(prev => prev.map(it => it.id === itemId ? {
            ...it,
            payments: (it.payments || []).map(p => p.id === paymentId ? { ...p, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : p)
        } : it));
    };

    const togglePaymentPaid = (itemId: string, paymentId: string) => {
        setItems(prev => prev.map(it => it.id === itemId ? {
            ...it,
            payments: (it.payments || []).map(p => {
                if (p.id !== paymentId) return p;
                const willPay = !p.paid;
                return {
                    ...p,
                    paid: willPay,
                    paidAt: willPay ? (p.paidAt || p.dueDate || new Date().toISOString().slice(0, 10)) : undefined
                };
            })
        } : it));
    };

    const removePayment = (itemId: string, paymentId: string) => {
        setItems(prev => prev.map(it => it.id === itemId ? {
            ...it,
            payments: (it.payments || []).filter(p => p.id !== paymentId)
        } : it));
    };

    // ----- Utilidades de geração rápida de planos -----
    const generateInstallments = (itemId: string, count: number) => {
        if (!count || count < 1) return;
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            const baseTotal = (it.totalAgreed && it.totalAgreed > 0) ? it.totalAgreed : (it.amount || 0);
            const total = baseTotal || (it.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
            const per = parseFloat((total / count).toFixed(2));
            const payments = Array.from({ length: count }, (_, i) => ({
                id: safeUUID(),
                label: `Parcela ${i + 1}`,
                amount: i === count - 1 ? parseFloat((total - per * (count - 1)).toFixed(2)) : per,
                paid: false,
                method: 'pix'
            }));
            return { ...it, payments, paymentPlanType: 'installments' };
        }));
    };

    const generateEntradaSaldo = (itemId: string, entradaPercent: number = 30) => {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            const baseTotal = (it.totalAgreed && it.totalAgreed > 0) ? it.totalAgreed : (it.amount || 0);
            const total = baseTotal || 0;
            const entrada = Math.round((total * entradaPercent) / 100);
            const saldo = total - entrada;
            const payments: PaymentEntry[] = [
                { id: safeUUID(), label: 'Entrada', amount: entrada, paid: false, method: 'pix' },
                { id: safeUUID(), label: 'Saldo', amount: saldo, paid: false, method: 'pix' }
            ];
            return { ...it, payments, paymentPlanType: 'milestones' };
        }));
    };

    const deleteItem = async (id: string) => {
        try {
            setLoadingMessage("Excluindo item...");
            setIsLoading(true);
            await deleteDoc(doc(db, 'finalCosts', id));
            setConfirmDelete(null);
            fetchItems();
        } catch (e) {
            console.error(e);
            setError("Erro ao excluir item.");
        } finally {
            setIsLoading(false);
        }
    };

    const venueBaseCost = chosenVenue ? (chosenVenue.venuePrice + chosenVenue.foodPrice + chosenVenue.drinkPrice) : 0;
    // Tenta localizar item de venue
    const venueItem = items.find(i => i.isVenue || i.category === 'local');
    const itemsForTotals = items;
    const perItemFinal = (it: FinalCostItem): number => {
        if (typeof it.totalAgreed === 'number' && it.totalAgreed > 0) {
            return Math.max(0, (it.totalAgreed || 0) - (it.discountValue || 0));
        }
        if (it.payments && it.payments.length > 0) {
            const sum = it.payments.reduce((a, p) => a + (p.amount || 0), 0);
            return Math.max(0, sum - (it.discountValue || 0));
        }
        return it.amount || 0;
    };
    const total = itemsForTotals.reduce((acc, it) => acc + perItemFinal(it), 0);
    const paidTotal = itemsForTotals.reduce((acc, it) => {
        if (it.payments && it.payments.length > 0) {
            const paidSum = it.payments.filter(p => p.paid).reduce((a, p) => a + (p.amount || 0), 0);
            // Proporcionalmente, se houver desconto aplicado sobre totalAgreed/soma das parcelas, considerar só parte paga? Simples: não descontar de novo; assume desconto já distribuído.
            return acc + paidSum;
        }
        return acc + (it.paid ? perItemFinal(it) : 0);
    }, 0);

    // Labels dinâmicos sem mencionar alimentação/bebidas quando forem 0
    const venueCostLabel = (() => {
        if (!chosenVenue) return 'Custo do Local';
        const hasFood = (chosenVenue.foodPrice || 0) > 0;
        const hasDrink = (chosenVenue.drinkPrice || 0) > 0;
        if (!hasFood && !hasDrink) return 'Custo do Local';
        const parts = ['base'];
        if (hasFood) parts.push('alimentação');
        if (hasDrink) parts.push('bebidas');
        return `Custo do Local (${parts.join(' + ')})`;
    })();
    const venueShortCostLabel = venueCostLabel.replace('Custo do Local', 'Custo');

    const categoryAggregates: Record<string, number> = {};
    items.forEach(i => {
        let amt: number;
        if (typeof i.totalAgreed === 'number' && i.totalAgreed > 0) {
            amt = Math.max(0, i.totalAgreed - (i.discountValue || 0));
        } else if (i.payments && i.payments.length > 0) {
            const sum = i.payments.reduce((a, p) => a + (p.amount || 0), 0);
            amt = Math.max(0, sum - (i.discountValue || 0));
        } else {
            amt = i.amount || 0;
        }
        categoryAggregates[i.category] = (categoryAggregates[i.category] || 0) + amt;
    });
    if (!venueItem && venueBaseCost > 0) {
        // Exibe custo potencial do local não configurado ainda (informativo)
        categoryAggregates['local'] = venueBaseCost;
    }
    const categoryLabels = Object.keys(categoryAggregates);
    const categoryValues = categoryLabels.map(l => categoryAggregates[l]);
    const palette = (idx: number) => `hsla(${(idx * 137.5) % 360},70%,55%,0.85)`;

    const categoriesData = {
        labels: categoryLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
        datasets: [{ data: categoryValues, backgroundColor: categoryLabels.map((_, i) => palette(i)), borderColor: categoryLabels.map((_, i) => palette(i).replace('0.85', '1')), borderWidth: 2, hoverOffset: 16 }]
    };
    const paidData = { labels: ['Pago/Incluído', 'Pendente'], datasets: [{ data: [paidTotal, Math.max(total - paidTotal, 0)], backgroundColor: [colors.success, colors.warning], borderColor: [colors.success, colors.warning], borderWidth: 2, hoverOffset: 16 }] };

    return (
        <>
            <div className="max-w-7xl mx-auto p-4">
                <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-7 h-7" style={{ color: colors.primary }} />
                    <h1 className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Custos Definitivos do Casamento</h1>
                </div>
                {chosenVenue ? (
                    <p className="mb-6 text-sm" style={{ color: colors.textSecondary }}>Local escolhido: <span className="font-semibold" style={{ color: colors.primary }}>{chosenVenue.name}</span> {venueItem ? ' (pagamentos configurados)' : <> | {venueShortCostLabel}: <span className="font-semibold">R$ {venueBaseCost.toLocaleString('pt-BR')}</span> <button type="button" onClick={() => {
                        // cria item local em modo edição
                        const uid = auth.currentUser?.uid;
                        const localDraft: FinalCostItem = {
                            id: 'local-draft',
                            description: chosenVenue.name,
                            category: 'local',
                            notes: 'Registrar pagamentos do local',
                            totalAgreed: venueBaseCost,
                            discountValue: 0,
                            amount: venueBaseCost,
                            paid: false,
                            paymentPlanType: 'milestones',
                            payments: [
                                { id: safeUUID(), label: 'Entrada', amount: Math.round(venueBaseCost * 0.3), paid: false, method: 'pix' },
                                { id: safeUUID(), label: 'Saldo', amount: venueBaseCost - Math.round(venueBaseCost * 0.3), paid: false, method: 'pix' }
                            ],
                            userId: uid,
                            isVenue: true
                        };
                        setItems(prev => [localDraft, ...prev]);
                        setEditingId('local-draft');
                    }} className="ml-2 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: colors.primary, color: 'white' }}>Configurar</button></>}
                    </p>
                ) : (
                    <div className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        <p style={{ color: colors.textSecondary }}>Nenhum local escolhido definido ainda. Defina em "Locais Favoritos".</p>
                    </div>
                )}
                {error && <div className="px-4 py-3 rounded-lg mb-6 border" style={{ backgroundColor: colors.error + '15', borderColor: colors.error + '40', color: colors.error }}><X className="inline-block w-4 h-4 mr-2" /> {error}</div>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                        <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Total</h3>
                        <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                            <CountUp end={total} duration={1200} decimals={0} prefix="R$ " />
                        </p>
                    </div>
                    <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                        <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Pago</h3>
                        <p className="text-2xl font-bold" style={{ color: colors.success }}>
                            <CountUp end={paidTotal} duration={1200} decimals={0} prefix="R$ " />
                        </p>
                    </div>
                    <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                        <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Pendente</h3>
                        <p className="text-2xl font-bold" style={{ color: colors.warning }}>
                            <CountUp end={Math.max(total - paidTotal, 0)} duration={1200} decimals={0} prefix="R$ " />
                        </p>
                    </div>
                </div>
                {/* Form removido: criação inline */}
                <div className="rounded-xl shadow-lg border mb-10" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <div className="flex items-center justify-between p-6 border-b gap-4 flex-wrap" style={{ borderColor: colors.border }}>
                        <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Lista de Custos</h2>
                        <button type="button" onClick={createDraftCost} disabled={!chosenVenue || isLoading} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: colors.primary, color: 'white' }}>Novo Custo</button>
                    </div>
                    <div className="p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {chosenVenue && !venueItem && (
                            <div className="border rounded-xl p-4" style={{ backgroundColor: colors.accent, borderColor: colors.border }}>
                                <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>{chosenVenue.name}</h3>
                                <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>{venueCostLabel}</p>
                                <p className="font-bold text-xl" style={{ color: colors.primary }}>R$ {venueBaseCost.toLocaleString('pt-BR')}</p>
                                <span className="inline-block mt-3 text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: colors.primary, color: 'white' }}>Local Escolhido</span>
                            </div>
                        )}
                        {items.length === 0 && !chosenVenue && <p className="col-span-full text-center text-sm" style={{ color: colors.textSecondary }}>Nenhum custo adicionado ainda.</p>}
                        {items.map(item => (
                            <div key={item.id} className={`border rounded-xl p-4 relative ${editingId === item.id ? 'md:col-span-2 lg:col-span-3 col-span-full' : ''}`} style={{ backgroundColor: item.paid ? colors.success + '15' : colors.surface, borderColor: item.paid ? colors.success : colors.border }}>
                                {editingId === item.id ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-2">
                                            <input name="description" placeholder="Descrição do custo" value={item.description} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border text-sm font-medium" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                                            <div className="flex gap-2 flex-wrap">
                                                <select name="category" value={item.category} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}>{categoriesBase.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                                <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border" style={{ backgroundColor: colors.accent, borderColor: colors.border, color: colors.text }}>
                                                    <input type="checkbox" name="paid" checked={item.paid} onChange={handleChange} className="w-4 h-4" style={{ accentColor: colors.primary }} /> Pago total
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-xs">
                                            <div>
                                                <label className="block mb-1" style={{ color: colors.textSecondary }}>Total Contratado</label>
                                                <input name="totalAgreed" type="number" step="0.01" min={0} value={item.totalAgreed || 0} onChange={handleChange} className="w-full px-2 py-1 rounded border" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                                            </div>
                                            <div>
                                                <label className="block mb-1" style={{ color: colors.textSecondary }}>Desconto</label>
                                                <input name="discountValue" type="number" step="0.01" min={0} value={item.discountValue || 0} onChange={handleChange} className="w-full px-2 py-1 rounded border" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                                            </div>
                                            <div>
                                                <label className="block mb-1" style={{ color: colors.textSecondary }}>Valor Final</label>
                                                <input disabled value={(() => { const agreed = item.totalAgreed || 0; const finalVal = Math.max(0, agreed - (item.discountValue || 0)); return finalVal.toFixed(2); })()} className="w-full px-2 py-1 rounded border opacity-70" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                                            </div>
                                        </div>
                                        {(() => {
                                            const sumPay = (item.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
                                            const agreed = item.totalAgreed || 0;
                                            const discount = item.discountValue || 0;
                                            const finalValue = Math.max(0, agreed - discount);
                                            if (sumPay > 0 && Math.abs(sumPay - finalValue) > 0.01) {
                                                return <div className="text-[11px] -mt-1" style={{ color: colors.warning }}>* Soma das parcelas (R$ {sumPay.toLocaleString('pt-BR')}) difere do Valor Final (R$ {finalValue.toLocaleString('pt-BR')}).</div>;
                                            }
                                            return null;
                                        })()}
                                        <textarea name="notes" placeholder="Observações" value={item.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 rounded-lg border text-xs" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                                        {/* Controles de Pagamento */}
                                        <div className="pt-2 border-t" style={{ borderColor: colors.border }}>
                                            <div className="flex flex-wrap gap-2 items-center mb-3">
                                                <span className="text-[11px] font-semibold" style={{ color: colors.textSecondary }}>Pagamentos</span>
                                                <button type="button" onClick={() => addPayment(item.id!)} className="text-[11px] px-2 py-1 rounded font-medium" style={{ backgroundColor: colors.primary, color: 'white' }}>+ Parcela</button>
                                                <button type="button" onClick={() => generateEntradaSaldo(item.id!)} className="text-[11px] px-2 py-1 rounded font-medium" style={{ backgroundColor: colors.accent, color: colors.text }}>Entrada/Saldo</button>
                                                <div className="flex items-center gap-1 text-[11px]">
                                                    <input type="number" min={1} defaultValue={3} id={`inst-${item.id}`} className="w-14 px-2 py-1 rounded border" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                                                    <button type="button" onClick={() => {
                                                        const el = document.getElementById(`inst-${item.id}`) as HTMLInputElement | null;
                                                        const n = el ? parseInt(el.value) || 1 : 1;
                                                        generateInstallments(item.id!, n);
                                                    }} className="px-2 py-1 rounded font-medium" style={{ backgroundColor: colors.accent, color: colors.text }}>Gerar Parcelas Iguais</button>
                                                </div>
                                            </div>
                                            <div className="space-y-2 max-h-64 overflow-auto pr-1">
                                                {(item.payments || []).map(p => (
                                                    <div key={p.id} className="border rounded-md p-2 text-[11px] flex flex-wrap gap-2 items-center" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                                                        <input
                                                            className="flex-grow min-w-[140px] px-2 py-1 rounded border"
                                                            style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                                                            placeholder="Label"
                                                            value={p.label}
                                                            onChange={e => updatePaymentField(item.id!, p.id, 'label', e.target.value)}
                                                        />
                                                        <input
                                                            type="date"
                                                            className="w-[140px] px-2 py-1 rounded border"
                                                            style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                                                            value={p.dueDate || ''}
                                                            onChange={e => updatePaymentField(item.id!, p.id, 'dueDate', e.target.value)}
                                                        />
                                                        <input
                                                            type="number" step="0.01"
                                                            className="w-[120px] px-2 py-1 rounded border text-right"
                                                            style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                                                            value={p.amount}
                                                            onChange={e => updatePaymentField(item.id!, p.id, 'amount', e.target.value)}
                                                        />
                                                        <select
                                                            className="w-[110px] px-2 py-1 rounded border"
                                                            style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                                                            value={p.method || 'pix'}
                                                            onChange={e => updatePaymentField(item.id!, p.id, 'method', e.target.value)}
                                                        >
                                                            <option value="pix">Pix</option>
                                                            <option value="cartao">Cartão</option>
                                                            <option value="boleto">Boleto</option>
                                                            <option value="transferencia">Transf.</option>
                                                            <option value="dinheiro">Dinheiro</option>
                                                            <option value="cheque">Cheque</option>
                                                            <option value="outro">Outro</option>
                                                        </select>
                                                        <label className="flex items-center gap-1 px-2 py-1 rounded border cursor-pointer" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.textSecondary }}>
                                                            <input type="checkbox" checked={p.paid} onChange={() => togglePaymentPaid(item.id!, p.id)} style={{ accentColor: colors.primary }} />
                                                            <span>{p.paid ? 'Pago' : 'Pagar'}</span>
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePayment(item.id!, p.id)}
                                                            className="px-3 py-1 rounded text-xs font-semibold ml-auto"
                                                            style={{ backgroundColor: colors.error, color: 'white' }}
                                                        >Del</button>
                                                    </div>
                                                ))}
                                                {(item.payments || []).length === 0 && <div className="text-center text-[11px] py-4 rounded border" style={{ backgroundColor: colors.accent, borderColor: colors.border, color: colors.textSecondary }}>Nenhuma parcela. Use os botões acima.</div>}
                                            </div>
                                            <div className="flex justify-between text-[10px] mt-2" style={{ color: colors.textSecondary }}>
                                                <span>Total parcelas: R$ {(item.payments || []).reduce((a, p) => a + (p.amount || 0), 0).toLocaleString('pt-BR')}</span>
                                                <span>Pagas: R$ {(item.payments || []).filter(p => p.paid).reduce((a, p) => a + (p.amount || 0), 0).toLocaleString('pt-BR')}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="button" onClick={() => saveEdit(item.id!)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: colors.primary, color: 'white' }}>{isLoading ? '...' : 'Salvar'}</button>
                                            <button type="button" onClick={() => { setItems(prev => prev.filter(it => it.id !== item.id || !item.id?.startsWith('draft-'))); setEditingId(null); fetchItems(); }} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: colors.textSecondary + '40', color: colors.text }}>Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-semibold mb-1 leading-snug" style={{ color: colors.text }}>{item.description}</h3>
                                        <p className="text-sm mb-3 font-medium tracking-wide" style={{ color: colors.textSecondary, letterSpacing: '.5px' }}>{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</p>
                                        {/* Valor exibido: soma das payments se existir detalhamento */}
                                        {item.discountValue && (item.totalAgreed || item.amount) ? (
                                            <div className="mb-2 space-y-0.5">
                                                <p className="text-xs line-through" style={{ color: colors.textSecondary }}>R$ {(item.totalAgreed || ((item.payments || []).reduce((a, p) => a + (p.amount || 0), 0) + (item.discountValue || 0))).toLocaleString('pt-BR')}</p>
                                                <p className="text-[11px]" style={{ color: colors.success }}>Desconto: R$ {item.discountValue.toLocaleString('pt-BR')}</p>
                                                <p className="font-bold" style={{ color: colors.primary }}>R$ {((item.totalAgreed || 0) - (item.discountValue || 0)).toLocaleString('pt-BR')}</p>
                                            </div>
                                        ) : (
                                            <p className="font-bold mb-2" style={{ color: colors.primary }}>R$ {(() => {
                                                if (item.amount && item.amount > 0) return item.amount;
                                                if (item.totalAgreed) return item.totalAgreed;
                                                if (item.payments && item.payments.length > 0) return item.payments.reduce((a, p) => a + (p.amount || 0), 0);
                                                return 0;
                                            })().toLocaleString('pt-BR')}</p>
                                        )}
                                        {item.notes && <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>{item.notes}</p>}
                                        {(() => {
                                            // Progresso dentro do card
                                            const finalVal = (() => {
                                                if (item.discountValue && (item.totalAgreed || 0) > 0) return Math.max(0, (item.totalAgreed || 0) - (item.discountValue || 0));
                                                if (item.totalAgreed) return item.totalAgreed;
                                                if (item.amount) return item.amount;
                                                if (item.payments && item.payments.length > 0) return item.payments.reduce((a, p) => a + (p.amount || 0), 0) - (item.discountValue || 0);
                                                return 0;
                                            })();
                                            const paidVal = (() => {
                                                if (item.payments && item.payments.length > 0) return item.payments.filter(p => p.paid).reduce((a, p) => a + (p.amount || 0), 0);
                                                return item.paid ? finalVal : 0;
                                            })();
                                            const pend = Math.max(0, finalVal - paidVal);
                                            const pct = finalVal ? Math.round((paidVal / finalVal) * 100) : 0;
                                            return (
                                                <div className="mb-5 space-y-2">
                                                    <div className="flex items-end justify-between flex-wrap gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold" style={{ color: colors.success }}>Pago</p>
                                                            <p className="text-lg font-bold leading-tight" style={{ color: colors.success }}>R$ {paidVal.toLocaleString('pt-BR')}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold" style={{ color: colors.warning }}>Falta</p>
                                                            <p className="text-lg font-bold leading-tight" style={{ color: colors.warning }}>R$ {pend.toLocaleString('pt-BR')}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>Progresso</p>
                                                            <p className="text-lg font-bold leading-tight" style={{ color: colors.primary }}>{pct}%</p>
                                                        </div>
                                                    </div>
                                                    <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.accent }}>
                                                        <div className="h-full transition-all" style={{ width: pct + '%', background: `linear-gradient(90deg, ${colors.primary}, ${colors.success})` }} />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        <div className="flex items-center justify-between">
                                            <button onClick={async () => { try { setLoadingMessage('Atualizando...'); setIsLoading(true); await updateDoc(doc(db, 'finalCosts', item.id!), { paid: !item.paid, updatedAt: new Date() }); setItems(prev => prev.map(it => it.id === item.id ? { ...it, paid: !it.paid } : it)); } catch (e) { console.error(e); setError('Erro ao atualizar.'); } finally { setIsLoading(false); } }} className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: item.paid ? colors.success : 'transparent', color: item.paid ? 'white' : colors.warning, border: `1px solid ${item.paid ? colors.success : colors.warning}` }}>{item.paid ? <><CheckCircle className="inline-block w-3 h-3 mr-1" /> Pago</> : <><Clock className="inline-block w-3 h-3 mr-1" /> Pendente</>}</button>
                                            <div className="flex gap-2">
                                                <button onClick={() => { ensurePaymentsStructure(item.id!); setPaymentsModalItem(item); }} className="p-2 rounded-lg text-[11px] font-semibold cursor-pointer shadow-sm hover:shadow transition" style={{ backgroundColor: colors.primary, color: '#fff' }}>Pagamentos</button>
                                                <button onClick={() => setEditingId(item.id!)} className="p-2 rounded-lg" style={{ backgroundColor: colors.primary + '20', color: colors.primary }}><Edit3 className="w-4 h-4" /></button>
                                                <button onClick={() => setConfirmDelete(item.id!)} className="p-2 rounded-lg" style={{ backgroundColor: colors.error, color: 'white' }}><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        {/* Pagamentos agora em modal para não quebrar grid */}
                                        {confirmDelete === item.id && (
                                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-4" style={{ backgroundColor: colors.surface }}><p className="mb-4" style={{ color: colors.text }}>Tem certeza que deseja excluir este item?</p><div className="flex gap-2"><button className="flex-1 font-semibold py-2 px-4 rounded-lg" style={{ backgroundColor: colors.error, color: 'white' }} onClick={() => deleteItem(item.id!)}><Trash2 className="inline-block w-4 h-4 mr-1" /> Excluir</button><button className="flex-1 font-semibold py-2 px-4 rounded-lg" style={{ backgroundColor: colors.textSecondary + '20', color: colors.text }} onClick={() => setConfirmDelete(null)}><X className="inline-block w-4 h-4 mr-1" /> Cancelar</button></div></div></div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl shadow-lg border p-6" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                        <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Visualizações</h2>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => setViewChart('categories')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${viewChart === 'categories' ? 'text-white' : ''}`} style={{ backgroundColor: viewChart === 'categories' ? colors.primary : colors.accent, color: viewChart === 'categories' ? 'white' : colors.text }}><Layers className="w-4 h-4" /> Categorias</button>
                            <button onClick={() => setViewChart('paid')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-all ${viewChart === 'paid' ? 'text-white' : ''}`} style={{ backgroundColor: viewChart === 'paid' ? colors.primary : colors.accent, color: viewChart === 'paid' ? 'white' : colors.text }}><BarChart3 className="w-4 h-4" /> Pago x Pendente</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {viewChart === 'categories' && <div className="relative h-[340px]"><Pie data={categoriesData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: colors.text } }, tooltip: { callbacks: { label: (ctx: any) => { const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0); const val = ctx.parsed; const pct = total ? ((val / total) * 100).toFixed(1) : '0'; return `${ctx.label}: R$ ${val.toLocaleString('pt-BR')} (${pct}%)`; } } } }, animation: { duration: 1200 } }} /></div>}
                        {viewChart === 'paid' && <div className="relative h-[340px]"><Doughnut data={paidData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: colors.text } }, tooltip: { callbacks: { label: (ctx: any) => { const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0); const val = ctx.parsed; const pct = total ? ((val / total) * 100).toFixed(1) : '0'; return `${ctx.label}: R$ ${val.toLocaleString('pt-BR')} (${pct}%)`; } } } }, animation: { duration: 1200 } }} /></div>}
                        <div className="flex flex-col justify-center gap-4">
                            <div><h3 className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Resumo</h3><ul className="space-y-2 text-sm" style={{ color: colors.text }}><li>Total: <strong>R$ {total.toLocaleString('pt-BR')}</strong></li><li>Pago: <strong style={{ color: colors.success }}>R$ {paidTotal.toLocaleString('pt-BR')}</strong></li><li>Pendente: <strong style={{ color: colors.warning }}>R$ {(total - paidTotal).toLocaleString('pt-BR')}</strong></li><li>Nº Itens: <strong>{items.length}</strong></li></ul></div>
                            <div><h3 className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Top Categorias</h3><ul className="space-y-1 text-xs" style={{ color: colors.text }}>{categoryLabels.sort((a, b) => categoryAggregates[b] - categoryAggregates[a]).slice(0, 5).map(c => { const val = categoryAggregates[c]; const pct = total ? ((val / total) * 100).toFixed(1) : '0'; return <li key={c} className="flex justify-between"><span className="truncate mr-2">{c.charAt(0).toUpperCase() + c.slice(1)}</span><span>R$ {val.toLocaleString('pt-BR')} ({pct}%)</span></li>; })}</ul></div>
                        </div>
                    </div>
                    <p className="text-xs mt-8 text-center" style={{ color: colors.textSecondary }}>Os custos definitivos ajudam a controlar contratos já fechados após a escolha do local.</p>
                </div>
            </div>
            {paymentsModalItem ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl shadow-xl flex flex-col" style={{ backgroundColor: colors.surface }}>
                        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: colors.border }}>
                            <div>
                                <h3 className="font-semibold text-lg" style={{ color: colors.text }}>Pagamentos - {paymentsModalItem?.description}</h3>
                                <p className="text-sm" style={{ color: colors.textSecondary }}>Total Final: R$ {(paymentsModalItem?.amount || Math.max(0, (paymentsModalItem?.totalAgreed || 0) - (paymentsModalItem?.discountValue || 0))).toLocaleString('pt-BR')}</p>
                            </div>
                            <button onClick={closePaymentsModal} className="px-4 py-2 rounded text-sm font-medium cursor-pointer hover:opacity-80" style={{ backgroundColor: colors.primary, color: '#fff' }}><X className="inline w-4 h-4 mr-1" /> Fechar</button>
                        </div>
                        <div className="p-5 space-y-5 overflow-auto text-sm">
                            {paymentsModalItem && (() => {
                                const discount = paymentsModalItem.discountValue || 0;
                                const totalPagRaw = (paymentsModalItem.payments || []).reduce((a, p) => a + (p.amount || 0), 0);
                                const baseTotal = (paymentsModalItem.totalAgreed && paymentsModalItem.totalAgreed > 0) ? paymentsModalItem.totalAgreed : (totalPagRaw || paymentsModalItem.amount || 0);
                                const finalExpect = Math.max(0, baseTotal - discount);
                                const pago = (paymentsModalItem.payments || []).filter(p => p.paid).reduce((a, p) => a + (p.amount || 0), 0);
                                const pend = Math.max(0, finalExpect - pago);
                                const pct = finalExpect ? Math.min(100, Math.round((pago / finalExpect) * 100)) : 0;
                                return (
                                    <div className="mb-2">
                                        <div className="flex items-end justify-between flex-wrap gap-6 mb-3">
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: colors.success }}>Pago</p>
                                                <p className="text-xl font-bold leading-tight" style={{ color: colors.success }}>R$ {pago.toLocaleString('pt-BR')}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: colors.warning }}>Falta</p>
                                                <p className="text-xl font-bold leading-tight" style={{ color: colors.warning }}>R$ {pend.toLocaleString('pt-BR')}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>Progresso</p>
                                                <p className="text-xl font-bold leading-tight" style={{ color: colors.primary }}>{pct}%</p>
                                            </div>
                                        </div>
                                        <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: colors.accent }}>
                                            <div className="h-full transition-all" style={{ width: pct + '%', background: `linear-gradient(90deg, ${colors.primary}, ${colors.success})` }} />
                                        </div>
                                    </div>
                                );
                            })()}
                            <div className="flex gap-3 flex-wrap">
                                <button onClick={() => { if (!paymentsModalItem) return; addPayment(paymentsModalItem.id!); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} className="px-4 py-2 rounded text-sm font-medium cursor-pointer hover:opacity-90" style={{ backgroundColor: colors.primary, color: 'white' }}>+ Parcela</button>
                                <button onClick={() => { if (!paymentsModalItem) return; saveEdit(paymentsModalItem.id!); }} className="px-4 py-2 rounded text-sm font-medium cursor-pointer hover:opacity-90" style={{ backgroundColor: colors.success, color: 'white' }}>Salvar</button>
                            </div>
                            <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
                                {(paymentsModalItem?.payments || []).map(p => {
                                    const due = p.dueDate ? new Date(p.dueDate) : null;
                                    const today = new Date();
                                    let statusLabel = p.paid ? 'Pago' : (due ? (due < new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? 'Atrasado' : (due.toISOString().slice(0, 10) === today.toISOString().slice(0, 10) ? 'Hoje' : 'Futuro')) : 'Sem data');
                                    let statusColor = p.paid ? colors.success : (statusLabel === 'Atrasado' ? colors.error : (statusLabel === 'Hoje' ? colors.warning : colors.primary));
                                    return (
                                        <div key={p.id} className="rounded-lg border p-4 flex flex-col gap-2" style={{ backgroundColor: colors.background, borderColor: colors.border }}>
                                            <div className="flex justify-between items-start gap-2 flex-wrap">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <input value={p.label} onChange={e => { if (!paymentsModalItem) return; updatePaymentField(paymentsModalItem.id!, p.id, 'label', e.target.value); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} className="text-sm font-medium px-3 py-2 rounded border" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                                                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor + '22', color: statusColor }}>{statusLabel}</span>
                                                    <select value={p.method || 'pix'} onChange={e => { if (!paymentsModalItem) return; updatePaymentField(paymentsModalItem.id!, p.id, 'method', e.target.value); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} className="text-sm px-3 py-2 rounded border" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}>
                                                        <option value="pix">Pix</option>
                                                        <option value="cartao">Cartão</option>
                                                        <option value="boleto">Boleto</option>
                                                        <option value="transferencia">Transf.</option>
                                                        <option value="dinheiro">Dinheiro</option>
                                                        <option value="cheque">Cheque</option>
                                                        <option value="outro">Outro</option>
                                                    </select>
                                                    <input type="date" value={p.dueDate || ''} onChange={e => { if (!paymentsModalItem) return; updatePaymentField(paymentsModalItem.id!, p.id, 'dueDate', e.target.value); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} className="text-sm px-3 py-2 rounded border" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                                                    <input type="number" step="0.01" value={p.amount} onChange={e => { if (!paymentsModalItem) return; updatePaymentField(paymentsModalItem.id!, p.id, 'amount', e.target.value); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} className="text-sm w-32 text-right px-3 py-2 rounded border" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                                                    <label className="text-[11px] flex items-center gap-1 px-3 py-2 rounded border cursor-pointer" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.textSecondary }}>
                                                        <input type="checkbox" checked={p.paid} onChange={() => { if (!paymentsModalItem) return; togglePaymentPaid(paymentsModalItem.id!, p.id); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} style={{ accentColor: colors.primary }} /> Pago
                                                    </label>
                                                    {p.paid && (
                                                        <input type="date" value={p.paidAt || ''} onChange={e => { if (!paymentsModalItem) return; updatePaymentField(paymentsModalItem.id!, p.id, 'paidAt', e.target.value); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} className="text-sm px-3 py-2 rounded border" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                                                    )}
                                                    <button onClick={() => { if (!paymentsModalItem) return; removePayment(paymentsModalItem.id!, p.id); setPaymentsModalItem(items.find(i => i.id === paymentsModalItem.id!) || null); }} className="px-3 py-2 rounded text-xs font-medium cursor-pointer hover:opacity-90" style={{ backgroundColor: colors.error, color: 'white' }}>Del</button>
                                                </div>
                                            </div>
                                            {p.paidAt && p.paid && <div className="text-[11px]" style={{ color: colors.textSecondary }}>Pago em {p.paidAt.split('-').reverse().join('/')}</div>}
                                        </div>
                                    );
                                })}
                                {(paymentsModalItem?.payments || []).length === 0 && <div className="text-center text-sm py-8 rounded border" style={{ backgroundColor: colors.accent, borderColor: colors.border, color: colors.textSecondary }}>Nenhuma parcela.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};

export default FinalCosts;
