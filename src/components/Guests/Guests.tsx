import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { auth, db } from '../../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import CountUp from '../common/CountUp';
import { Plus, Trash2, Edit3, Check, X, Users, ChevronDown } from 'lucide-react';

interface GuestItem {
    id: string;
    name: string;
    side: 'noivo' | 'noiva';
    createdAt?: any;
    updatedAt?: any;
    userId?: string;
}

const Guests: React.FC = () => {
    const { colors } = useContext(ThemeContext);
    const [guests, setGuests] = useState<GuestItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [draftSide, setDraftSide] = useState<'noivo' | 'noiva'>('noivo');
    const [sideFilter, setSideFilter] = useState<'todos' | 'noivo' | 'noiva'>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingSide, setEditingSide] = useState<'noivo' | 'noiva'>('noivo');

    const fetchGuests = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const col = collection(db, 'guests');
            // podemos filtrar futuramente por casamento id se houver multi-casamentos
            const q = query(col, orderBy('createdAt', 'asc'));
            const snap = await getDocs(q);
            const data: GuestItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            setGuests(data);
        } catch (e: any) {
            console.error(e); setError('Erro ao carregar convidados.');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchGuests(); }, [fetchGuests]);

    const total = guests.length;
    const totalNoivo = guests.filter(g => g.side === 'noivo').length;
    const totalNoiva = guests.filter(g => g.side === 'noiva').length;

    const filteredGuests = guests.filter(g => {
        const sideOk = sideFilter === 'todos' ? true : g.side === sideFilter;
        const nameOk = searchTerm.trim() ? g.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) : true;
        return sideOk && nameOk;
    });

    // Agrupamento por inicial (normalizando acentos)
    const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const getInitial = (name: string) => {
        const n = normalize(name).trim();
        const ch = n.charAt(0).toUpperCase();
        return /[A-Z]/.test(ch) ? ch : '#';
    };
    const groups: Record<string, GuestItem[]> = {};
    filteredGuests.forEach(g => {
        const init = getInitial(g.name);
        if (!groups[init]) groups[init] = [];
        groups[init].push(g);
    });
    const sortedInitials = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    sortedInitials.forEach(k => groups[k].sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'pt-BR')));

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const toggleGroup = (k: string) => setCollapsed(prev => ({ ...prev, [k]: !prev[k] }));
    const expandAll = () => {
        const all: Record<string, boolean> = {};
        sortedInitials.forEach(k => all[k] = false);
        setCollapsed(all);
    };
    const collapseAll = () => {
        const all: Record<string, boolean> = {};
        sortedInitials.forEach(k => all[k] = true);
        setCollapsed(all);
    };

    const createGuest = async () => {
        if (!draftName.trim()) return;
        setLoading(true); setError(null);
        try {
            await addDoc(collection(db, 'guests'), {
                name: draftName.trim(),
                side: draftSide,
                createdAt: new Date(),
                userId: auth.currentUser?.uid || null
            });
            setDraftName('');
            fetchGuests();
        } catch (e) {
            console.error(e); setError('Erro ao adicionar.');
        } finally { setLoading(false); }
    };

    const startEdit = (g: GuestItem) => {
        setEditingId(g.id);
        setEditingName(g.name);
        setEditingSide(g.side);
    };

    const saveEdit = async () => {
        if (!editingId) return;
        if (!editingName.trim()) { setEditingId(null); return; }
        setLoading(true); setError(null);
        try {
            await updateDoc(doc(db, 'guests', editingId), { name: editingName.trim(), side: editingSide, updatedAt: new Date() });
            setEditingId(null); setEditingName(''); fetchGuests();
        } catch (e) { console.error(e); setError('Erro ao salvar.'); } finally { setLoading(false); }
    };

    const deleteGuest = async (id: string) => {
        if (!confirm('Excluir convidado?')) return;
        setLoading(true); setError(null);
        try { await deleteDoc(doc(db, 'guests', id)); fetchGuests(); } catch (e) { console.error(e); setError('Erro ao excluir.'); } finally { setLoading(false); }
    };

    return (
        <div className="max-w-5xl mx-auto p-4">
            <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8" style={{ color: colors.primary }} />
                <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Lista de Convidados</h1>
            </div>

            {error && <div className="mb-4 px-4 py-3 rounded-lg" style={{ backgroundColor: colors.error + '15', color: colors.error }}> {error} </div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                    <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Total</h3>
                    <p className="text-3xl font-bold" style={{ color: colors.primary }}><CountUp end={total} duration={1200} decimals={0} /></p>
                </div>
                <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                    <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Lado Noivo</h3>
                    <p className="text-3xl font-bold" style={{ color: colors.success }}><CountUp end={totalNoivo} duration={1200} decimals={0} /></p>
                </div>
                <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                    <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Lado Noiva</h3>
                    <p className="text-3xl font-bold" style={{ color: colors.warning }}><CountUp end={totalNoiva} duration={1200} decimals={0} /></p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="flex items-center gap-2">
                    <button onClick={() => setSideFilter('todos')} className={`px-3 py-1 rounded-full text-xs font-semibold ${sideFilter === 'todos' ? 'shadow' : ''}`} style={{ backgroundColor: sideFilter === 'todos' ? colors.primary : colors.accent, color: sideFilter === 'todos' ? 'white' : colors.text }}>Todos</button>
                    <button onClick={() => setSideFilter('noivo')} className={`px-3 py-1 rounded-full text-xs font-semibold ${sideFilter === 'noivo' ? 'shadow' : ''}`} style={{ backgroundColor: sideFilter === 'noivo' ? colors.primary : colors.accent, color: sideFilter === 'noivo' ? 'white' : colors.text }}>Noivo</button>
                    <button onClick={() => setSideFilter('noiva')} className={`px-3 py-1 rounded-full text-xs font-semibold ${sideFilter === 'noiva' ? 'shadow' : ''}`} style={{ backgroundColor: sideFilter === 'noiva' ? colors.primary : colors.accent, color: sideFilter === 'noiva' ? 'white' : colors.text }}>Noiva</button>
                </div>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar nome..." className="px-3 py-2 rounded-lg border text-sm flex-grow md:flex-grow-0 md:w-60" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }} />
                {(sideFilter !== 'todos' || searchTerm) && (
                    <button onClick={() => { setSideFilter('todos'); setSearchTerm(''); }} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: colors.textSecondary + '40', color: colors.text }}>Limpar</button>
                )}
            </div>

            <div className="rounded-xl shadow-lg border mb-10" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                <div className="flex items-center justify-between p-6 border-b gap-4 flex-wrap" style={{ borderColor: colors.border }}>
                    <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Adicionar Convidado</h2>
                    <div className="flex gap-2 flex-wrap items-center">
                        <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="Nome" className="px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                        <select value={draftSide} onChange={e => setDraftSide(e.target.value as any)} className="px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}>
                            <option value="noivo">Noivo</option>
                            <option value="noiva">Noiva</option>
                        </select>
                        <button onClick={createGuest} disabled={loading || !draftName.trim()} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ backgroundColor: colors.primary, color: 'white' }}>{loading ? '...' : <><Plus className="inline w-4 h-4 mr-1" /> Adicionar</>}</button>
                    </div>
                </div>
                <div className="p-6">
                    {filteredGuests.length === 0 && <p className="text-sm text-center" style={{ color: colors.textSecondary }}>Nenhum convidado encontrado.</p>}
                    {filteredGuests.length > 0 && (
                        <div className="flex gap-2 mb-4 flex-wrap text-xs">
                            <button onClick={expandAll} className="px-3 py-1 rounded font-semibold" style={{ backgroundColor: colors.primary + '20', color: colors.primary, cursor: 'pointer' }}>Expandir todos</button>
                            <button onClick={collapseAll} className="px-3 py-1 rounded font-semibold" style={{ backgroundColor: colors.primary + '20', color: colors.primary, cursor: 'pointer' }}>Colapsar todos</button>
                        </div>
                    )}
                    <ul className="space-y-4">
                        {sortedInitials.map(init => (
                            <li key={init} className="border rounded-lg overflow-hidden" style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(init)}
                                    className="w-full flex items-center gap-4 px-5 py-3 text-sm cursor-pointer transition-all group"
                                    style={{
                                        background: collapsed[init] ? colors.surface : `linear-gradient(135deg, ${colors.accent}, ${colors.surface})`,
                                        color: colors.text,
                                        boxShadow: collapsed[init] ? 'none' : `inset 0 0 0 1px ${colors.border}`
                                    }}
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-7 h-7 flex items-center justify-center rounded-md font-bold text-sm shadow-inner" style={{ backgroundColor: colors.primary + '25', color: colors.primary }}>
                                            {init === '#' ? '#' : init}
                                        </div>
                                        <span className="font-semibold tracking-wide truncate" style={{ letterSpacing: '.5px' }}>{init === '#' ? 'Outros' : `Letra ${init}`}</span>
                                    </div>
                                    <span className="text-[11px] font-medium px-2 py-1 rounded-full" style={{ backgroundColor: colors.primary + '25', color: colors.primary }}>{groups[init].length}</span>
                                    <ChevronDown
                                        className={`w-5 h-5 transition-transform duration-300 ${collapsed[init] ? '-rotate-90' : 'rotate-0'} opacity-80 group-hover:opacity-100`}
                                        style={{ color: colors.textSecondary }}
                                    />
                                </button>
                                {!collapsed[init] && (
                                    <ul className="divide-y" style={{ borderColor: colors.border }}>
                                        {groups[init].map(g => (
                                            <li key={g.id} className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3" style={{ backgroundColor: colors.surface }}>
                                                {editingId === g.id ? (
                                                    <>
                                                        <input value={editingName} onChange={e => setEditingName(e.target.value)} className="px-3 py-2 rounded border flex-1" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }} />
                                                        <select value={editingSide} onChange={e => setEditingSide(e.target.value as any)} className="px-3 py-2 rounded border" style={{ backgroundColor: colors.background, borderColor: colors.border, color: colors.text }}>
                                                            <option value="noivo">Noivo</option>
                                                            <option value="noiva">Noiva</option>
                                                        </select>
                                                        <div className="flex gap-2 ml-auto">
                                                            <button onClick={saveEdit} className="px-3 py-2 rounded text-xs font-semibold" style={{ backgroundColor: colors.success, color: 'white', cursor: 'pointer' }}><Check className="inline w-4 h-4" /></button>
                                                            <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded text-xs font-semibold" style={{ backgroundColor: colors.error, color: 'white', cursor: 'pointer' }}><X className="inline w-4 h-4" /></button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex-1">
                                                            <p className="font-semibold" style={{ color: colors.text }}>{g.name}</p>
                                                            <p className="text-[11px]" style={{ color: colors.textSecondary }}>Lado: {g.side === 'noivo' ? 'Noivo' : 'Noiva'}</p>
                                                        </div>
                                                        <div className="flex gap-2 ml-auto">
                                                            <button onClick={() => startEdit(g)} className="px-3 py-2 rounded text-xs font-semibold" style={{ backgroundColor: colors.primary + '20', color: colors.primary, cursor: 'pointer' }}><Edit3 className="inline w-4 h-4" /></button>
                                                            <button onClick={() => deleteGuest(g.id)} className="px-3 py-2 rounded text-xs font-semibold" style={{ backgroundColor: colors.error, color: 'white', cursor: 'pointer' }}><Trash2 className="inline w-4 h-4" /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <p className="text-xs text-center" style={{ color: colors.textSecondary }}>Registre e gerencie a lista de convidados separados por lado.</p>
        </div>
    );
};

export default Guests;
