// src/routes/PrivateRoute.tsx
import React from "react";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { Navigate } from "react-router-dom";

const LoadingSpinner = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)'
    }}>
        <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--bg-tertiary)',
            borderRadius: '50%',
            borderTop: '4px solid var(--primary-color)',
            animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `}</style>
        <p style={{
            marginTop: '16px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
        }}>Carregando...</p>
    </div>
);

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [userLogged, setUserLogged] = useState<boolean | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUserLogged(!!user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (!userLogged) return <Navigate to="/login" />;

    return children;
};

export default PrivateRoute;