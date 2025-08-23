import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { auth, db } from '../../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import CountUp from '../common/CountUp';
import { Plus, Trash2, Edit3, Check, X, Users, ChevronDown, RefreshCcw } from 'lucide-react';

interface GuestItem {
    id: string;
    name: string;
    side: 'noivo' | 'noiva';
    createdAt?: any;
    updatedAt?: any;
    userId?: string;
    rsvpStatus?: 'pending' | 'confirmed' | 'declined';
    inviteCode?: string; // código curto para link público
    confirmedAt?: any;
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
    // estado de controle de cópia de link
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // util para gerar código curto único (8 chars base36)
    const makeInviteCode = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(-8).toUpperCase();

    const fetchGuests = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const colRef = collection(db, 'guests');
            const qy = query(colRef, orderBy('createdAt', 'asc'));
            const snap = await getDocs(qy);
            let data: GuestItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

            // atribui códigos faltantes localmente e dispara atualizações em paralelo sem bloquear UI
            const updates: Promise<any>[] = [];
            data = data.map(g => {
                if (!g.inviteCode) {
                    const newCode = makeInviteCode();
                    updates.push(updateDoc(doc(db, 'guests', g.id), { inviteCode: newCode, updatedAt: new Date() }));
                    return { ...g, inviteCode: newCode };
                }
                return g;
            });

            if (updates.length) {
                // executa em background
                Promise.allSettled(updates).catch(() => {/* silencia erros individuais */});
            }
            setGuests(data);
        } catch (e: any) {
            console.error(e); setError('Erro ao carregar convidados.');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchGuests(); }, [fetchGuests]);

    const total = guests.length;
    const totalNoivo = guests.filter(g => g.side === 'noivo').length;
    const totalNoiva = guests.filter(g => g.side === 'noiva').length;
    const totalConfirmed = guests.filter(g => g.rsvpStatus === 'confirmed').length;
    const totalDeclined = guests.filter(g => g.rsvpStatus === 'declined').length;
    const totalPending = total - totalConfirmed - totalDeclined;

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
                userId: auth.currentUser?.uid || null,
                rsvpStatus: 'pending',
                inviteCode: makeInviteCode()
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

    const updateRsvp = async (g: GuestItem, status: 'pending' | 'confirmed' | 'declined') => {
        setLoading(true); setError(null);
        try {
            await updateDoc(doc(db, 'guests', g.id), { rsvpStatus: status, confirmedAt: status === 'confirmed' ? new Date() : null, updatedAt: new Date() });
            fetchGuests();
        } catch (e) { console.error(e); setError('Erro ao atualizar RSVP.'); } finally { setLoading(false); }
    };

    // geração manual não é mais necessária porque agora é automática (placeholder removido).

    const copyInviteLink = async (g: GuestItem) => {
        if (!g.inviteCode) return;
        const url = `${window.location.origin}/invite/${g.inviteCode}`;
        let success = false;
        if (navigator.clipboard && window.isSecureContext) {
            try { await navigator.clipboard.writeText(url); success = true; } catch { success = false; }
        }
        if (!success) {
            try {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                success = true;
            } catch {
                success = false;
            }
        }
        if (success) {
            setCopiedId(g.id);
            setTimeout(() => setCopiedId(prev => prev === g.id ? null : prev), 1800);
        } else {
            alert('Não foi possível copiar. Copie manualmente: ' + url);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4">
            <div className="flex items-center gap-3 mb-6">
                <Users className="w-8 h-8" style={{ color: colors.primary }} />
                <h1 className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}>Lista de Convidados</h1>
            </div>

            {error && <div className="mb-4 px-4 py-3 rounded-lg" style={{ backgroundColor: colors.error + '15', color: colors.error }}> {error} </div>}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
                <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                    <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Confirmados</h3>
                    <p className="text-3xl font-bold" style={{ color: colors.success }}><CountUp end={totalConfirmed} duration={1200} decimals={0} /></p>
                </div>
                <div className="p-4 rounded-xl shadow-md text-center" style={{ backgroundColor: colors.surface }}>
                    <h3 className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>Pendentes</h3>
                    <p className="text-3xl font-bold" style={{ color: colors.primary }}><CountUp end={totalPending} duration={1200} decimals={0} /></p>
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
                                                        <div className="flex flex-col md:flex-row md:items-center w-full gap-4">
                                                            {/* Coluna Nome */}
                                                            <div className="flex min-w-[160px] flex-col flex-shrink-0">
                                                                <p className="font-semibold leading-tight" style={{ color: colors.text }}>{g.name}</p>
                                                                <p className="text-[11px]" style={{ color: colors.textSecondary }}>Lado: {g.side === 'noivo' ? 'Noivo' : 'Noiva'}</p>
                                                            </div>
                                                            {/* RSVP + Status */}
                                                            <div className="flex flex-col gap-2 md:flex-row md:items-center flex-1 min-w-[240px]">
                                                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                                                    <span className="px-2 py-0.5 rounded-full font-medium tracking-wide" style={{ backgroundColor: g.rsvpStatus === 'confirmed' ? colors.success + '25' : g.rsvpStatus === 'declined' ? colors.error + '25' : colors.accent, color: g.rsvpStatus === 'confirmed' ? colors.success : g.rsvpStatus === 'declined' ? colors.error : colors.textSecondary }}>
                                                                        {g.rsvpStatus === 'pending' ? 'Pendente' : g.rsvpStatus === 'confirmed' ? 'Confirmado' : 'Não irá'}
                                                                    </span>
                                                                    {g.confirmedAt && g.rsvpStatus === 'confirmed' && (
                                                                        <span className="text-[10px] opacity-70" style={{ color: colors.textSecondary }}>em {new Date(g.confirmedAt.seconds ? g.confirmedAt.seconds * 1000 : g.confirmedAt).toLocaleDateString('pt-BR')}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <div className="flex rounded-lg overflow-hidden border shadow-sm" style={{ borderColor: colors.border }}>
                                                                        <button type="button" onClick={() => updateRsvp(g, 'confirmed')} className="px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1" style={{ backgroundColor: g.rsvpStatus === 'confirmed' ? colors.success : 'transparent', color: g.rsvpStatus === 'confirmed' ? 'white' : colors.success, borderRight: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                                                            <Check className="w-3 h-3" /> <span>Sim</span>
                                                                        </button>
                                                                        <button type="button" onClick={() => updateRsvp(g, 'declined')} className="px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1" style={{ backgroundColor: g.rsvpStatus === 'declined' ? colors.error : 'transparent', color: g.rsvpStatus === 'declined' ? 'white' : colors.error, borderRight: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                                                                            <X className="w-3 h-3" /> <span>Não</span>
                                                                        </button>
                                                                        <button type="button" onClick={() => updateRsvp(g, 'pending')} className="px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1" style={{ backgroundColor: g.rsvpStatus === 'pending' ? colors.primary : 'transparent', color: g.rsvpStatus === 'pending' ? 'white' : colors.primary, cursor: 'pointer' }}>
                                                                            <RefreshCcw className="w-3 h-3" /> <span>Reset</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Convite */}
                                                            <div className="flex items-center gap-2 flex-wrap md:justify-end md:flex-row flex-1">
                                                                <button
                                                                    onClick={() => g.inviteCode && copyInviteLink(g)}
                                                                    disabled={!g.inviteCode}
                                                                    className="px-3 py-1.5 rounded text-[11px] font-semibold disabled:opacity-50"
                                                                    style={{ backgroundColor: copiedId === g.id ? colors.success : colors.primary, color: 'white', cursor: g.inviteCode ? 'pointer' : 'default', transition: 'background-color .25s' }}
                                                                >
                                                                    {!g.inviteCode ? 'Gerando...' : (copiedId === g.id ? 'Copiado!' : 'Copiar Link')}
                                                                </button>
                                                                {g.inviteCode && (
                                                                    <span className="px-2 py-1 rounded text-[11px] select-all" style={{ backgroundColor: colors.accent, color: colors.textSecondary }}>Cod: {g.inviteCode}</span>
                                                                )}
                                                                <div className="flex gap-2 ml-auto">
                                                                    <button onClick={() => startEdit(g)} className="px-3 py-1.5 rounded text-[11px] font-semibold" style={{ backgroundColor: colors.primary + '20', color: colors.primary, cursor: 'pointer' }}><Edit3 className="inline w-4 h-4" /></button>
                                                                    <button onClick={() => deleteGuest(g.id)} className="px-3 py-1.5 rounded text-[11px] font-semibold" style={{ backgroundColor: colors.error, color: 'white', cursor: 'pointer' }}><Trash2 className="inline w-4 h-4" /></button>
                                                                </div>
                                                            </div>
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
