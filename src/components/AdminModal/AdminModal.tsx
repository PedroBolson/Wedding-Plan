// src/components/AdminModal.tsx
import React, { useState, useEffect } from 'react';
import './AdminModal.css';
import { db, auth } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { makeUserAdmin } from '../../firebase/createadmin';

interface CombinedUser {
    uid: string;
    email: string;
    isAdmin: boolean;
}

type AdminModalProps = {
    onClose: () => void;
};

const LIST_API = import.meta.env.VITE_FIREBASE_LIST_USER_API;
const CREATE_API = import.meta.env.VITE_FIREBASE_ADMIN_API;
const DELETE_API = import.meta.env.VITE_FIREBASE_DELETE_USER_API;

const AdminModal: React.FC<AdminModalProps> = ({ onClose }) => {
    const [users, setUsers] = useState<CombinedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingUid, setDeletingUid] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '' });

    // Carrega todos os usuários e marca os admins
    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const current = auth.currentUser;
            if (!current) throw new Error('Admin não autenticado');
            const token = await current.getIdToken();

            const resAuth = await fetch(LIST_API, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
            if (!resAuth.ok) {
                const err = await resAuth.json();
                throw new Error(err.message || 'Erro ao listar usuários');
            }
            const { users: authList } = (await resAuth.json()) as { users: { uid: string; email: string }[] };

            const snap = await getDocs(collection(db, 'users'));
            const adminSet = new Set(snap.docs.map(d => d.id));

            setUsers(authList.map(u => ({ uid: u.uid, email: u.email, isAdmin: adminSet.has(u.uid) })));
        } catch (err: any) {
            console.error('Erro ao carregar usuários:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setDeletingUid(null);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    // Concede role admin
    const handleGrantAdmin = async (uid: string, email: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await makeUserAdmin(uid, email);
            setSuccess(`Usuário ${email} promovido a admin.`);
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao conceder admin:', err);
            setError(err.message);
        }
    };

    // Revoga role admin
    const handleRevokeAdmin = async (uid: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            await deleteDoc(doc(db, 'users', uid));
            setSuccess('Privilégios de admin removidos.');
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao revogar admin:', err);
            setError(err.message);
        }
    };

    // Remove usuário comum do Auth via endpoint DELETE
    const handleDeleteUser = async (uid: string, email: string) => {
        setDeletingUid(uid);
        setError(null);
        setSuccess(null);
        try {
            const current = auth.currentUser;
            if (!current) throw new Error('Admin não autenticado');
            const token = await current.getIdToken();

            const res = await fetch(DELETE_API, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uid }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Erro ao remover usuário');
            }
            setSuccess(`Usuário ${email} removido com sucesso.`);
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao remover usuário:', err);
            setError(err.message);
        }
    };

    // Cria novo usuário no Auth
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const current = auth.currentUser;
            if (!current) throw new Error('Admin não autenticado');
            const token = await current.getIdToken();

            const res = await fetch(CREATE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newUser),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Erro ao criar usuário');
            }
            setSuccess(`Usuário ${newUser.email} criado com sucesso!`);
            setNewUser({ email: '', password: '' });
            setShowAdd(false);
            await loadUsers();
        } catch (err: any) {
            console.error('Erro ao criar usuário:', err);
            setError(err.message);
        }
    };

    return (
        <div className="admin-backdrop" onClick={onClose}>
            <div className="admin-modal" onClick={e => e.stopPropagation()}>
                <header className="admin-header">
                    <h2>Gerenciar Usuários</h2>
                    <button className="admin-close-btn" onClick={onClose}>×</button>
                </header>

                <section className="admin-actions">
                    <button className="admin-btn" onClick={() => setShowAdd(!showAdd)} disabled={loading}>
                        {showAdd ? 'Cancelar criação' : 'Criar Novo Usuário'}
                    </button>
                    <button className="admin-btn" onClick={loadUsers} disabled={loading}>
                        {loading ? <div className="admin-spinner" /> : 'Atualizar Lista'}
                    </button>
                </section>

                {showAdd && (
                    <form className="admin-add-form" onSubmit={handleCreateUser}>
                        <input
                            className="admin-input"
                            type="email"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            required
                        />
                        <input
                            className="admin-input"
                            type="password"
                            placeholder="Senha"
                            minLength={6}
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            required
                        />
                        <button className="admin-submit-btn" type="submit" disabled={loading}>
                            {loading ? <div className="admin-spinner" /> : 'Criar Usuário'}
                        </button>
                    </form>
                )}

                {error && <div className="admin-error">{error}</div>}
                {success && <div className="admin-success">{success}</div>}

                <table className="admin-table">
                    <thead>
                        <tr><th>Email</th><th>Função</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.uid} className="admin-row">
                                <td>{u.email}</td>
                                <td>{u.isAdmin ? 'Admin' : 'User'}</td>
                                <td>
                                    {u.isAdmin ? (
                                        <button className="admin-action-btn revoke" onClick={() => handleRevokeAdmin(u.uid)} disabled={loading}>
                                            {loading ? <div className="admin-spinner" /> : 'Remover Admin'}
                                        </button>
                                    ) : (
                                        <>
                                            <button className="admin-action-btn grant" onClick={() => handleGrantAdmin(u.uid, u.email)} disabled={loading}>
                                                {loading ? <div className="admin-spinner" /> : 'Conceder Admin'}
                                            </button>
                                            <button className="admin-action-btn remove-user" onClick={() => handleDeleteUser(u.uid, u.email)} disabled={deletingUid === u.uid}>
                                                {deletingUid === u.uid ? <div className="admin-spinner" /> : 'Remover Usuário'}
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminModal;
