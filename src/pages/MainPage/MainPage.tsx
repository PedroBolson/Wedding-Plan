// src/pages/MainPage.tsx
import { useContext, useState, useEffect, useRef } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import Nav from "../../components/Nav/Nav";
import Planning from "../../components/Planning/Planning";
import Favorites from "../../components/Favorites/Favorites";
import Calendar from "../../components/Calendar/Calendar";
import Budget from "../../components/Budget/Budget";
import { ThemeContext } from "../../contexts/ThemeContext";
import ExpenseChart from "../../components/ExpenseChart/ExpenseChart";
import FinalCosts from "../../components/FinalCosts/FinalCosts";
import { useLoading } from "../../contexts/LoadingContext";

const MainPage = () => {
    const navigate = useNavigate();
    const { darkTheme, toggleTheme, colors } = useContext(ThemeContext);
    const [activeSection, setActiveSection] = useState('planning');
    const [isAdmin, setIsAdmin] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [hasChosenVenue, setHasChosenVenue] = useState(false);
    const { setIsLoading, setLoadingMessage } = useLoading();
    const isMountedRef = useRef(true);

    // Monitor window resize for responsive design
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        isMountedRef.current = true;

        setLoadingMessage("Verificando usuário...");
        setIsLoading(true);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!isMountedRef.current) return;
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists() && isMountedRef.current) {
                        const userData = userDoc.data();
                        console.log("User data:", userData);
                        setIsAdmin(userData.role === "admin");
                    } else if (isMountedRef.current) {
                        console.log("Documento de usuário não existe");
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Erro ao verificar status de admin:", error);
                    if (isMountedRef.current) setIsAdmin(false);
                } finally {
                    if (isMountedRef.current) setIsLoading(false);
                }
            } else {
                if (isMountedRef.current) {
                    setIsAdmin(false);
                    setIsLoading(false);
                    navigate("/login");
                }
            }
        });

        return () => {
            isMountedRef.current = false;
            unsubscribe();
            setIsLoading(false);
        };
    }, [navigate]);

    // Verificar se existe local escolhido (polling simples)
    useEffect(() => {
        let canceled = false;
        const checkChosen = async () => {
            try {
                const { collection, getDocs, query, where } = await import('firebase/firestore');
                const q = query(collection(db, 'venues'), where('isChosen', '==', true));
                const snap = await getDocs(q);
                if (!canceled) setHasChosenVenue(!snap.empty);
            } catch (e) {
                console.error('Erro ao verificar local escolhido', e);
            }
        };
        checkChosen();
        const interval = setInterval(checkChosen, 8000);
        return () => { canceled = true; clearInterval(interval); };
    }, []);

    const handleLogout = async () => {
        if (!isMountedRef.current) return;

        try {
            setLoadingMessage("Saindo...");
            setIsLoading(true);

            sessionStorage.removeItem('google_access_token');
            localStorage.removeItem('google_access_token');
            await signOut(auth);

            if (isMountedRef.current) {
                setIsLoading(false);
                navigate("/login");
            }
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    // Renderizar conteúdo com base na seção ativa
    const renderActiveSection = () => {
        switch (activeSection) {
            case 'planning':
                return <Planning />;
            case 'favorites':
                return <Favorites />;
            case 'calendar':
                return <Calendar />;
            case 'budget':
                return <Budget />;
            case 'chart':
                return <ExpenseChart />;
            case 'finalCosts':
                return <FinalCosts />;
            case 'guests':
                return (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        backgroundColor: colors.surface,
                        borderRadius: '0.5rem',
                        margin: '2rem',
                        maxWidth: '32rem',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: colors.text,
                            marginBottom: '1rem'
                        }}>Em breve!</h2>
                        <p style={{
                            color: colors.textSecondary
                        }}>Esta funcionalidade estará disponível em uma atualização futura.</p>
                    </div>
                );
            default:
                return <Planning />;
        }
    };

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: colors.background,
            position: 'relative'
        }}>
            <Nav
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={handleLogout}
                darkTheme={darkTheme}
                toggleTheme={toggleTheme}
                isAdmin={isAdmin}
                hasChosenVenue={hasChosenVenue}
            />

            <main className="flex-1 transition-all duration-300 min-h-screen"
                style={{
                    paddingTop: windowWidth < 1051 ? '4rem' : '1.5rem',
                    paddingRight: windowWidth < 768 ? '0.5rem' : windowWidth < 1024 ? '1rem' : '2rem',
                    paddingBottom: windowWidth < 768 ? '1rem' : '2rem',
                    paddingLeft: windowWidth >= 1051 ? '18rem' : windowWidth < 768 ? '0.5rem' : '1.5rem'
                }}>
                <div className="w-full max-w-6xl mx-auto">
                    {renderActiveSection()}
                </div>
            </main>
        </div>
    );
};

export default MainPage;