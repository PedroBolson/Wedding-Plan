// src/pages/MainPage.tsx
import { useContext, useState, useEffect, useRef } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import "./MainPage.css";
import Nav from "../../components/Nav/Nav";
import Planning from "../../components/Planning/Planning";
import Favorites from "../../components/Favorites/Favorites";
import Calendar from "../../components/Calendar/Calendar";
import Budget from "../../components/Budget/Budget";
import { ThemeContext } from "../../contexts/ThemeContext";
import ExpenseChart from "../../components/ExpenseChart/ExpenseChart";
import { useLoading } from "../../contexts/LoadingContext";

const MainPage = () => {
    const navigate = useNavigate();
    const { darkTheme, toggleTheme } = useContext(ThemeContext);
    const [activeSection, setActiveSection] = useState('planning');
    const [isAdmin, setIsAdmin] = useState(false);
    const { setIsLoading, setLoadingMessage } = useLoading();
    const isMountedRef = useRef(true);

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
            case 'guests':
                return (
                    <div className="coming-soon">
                        <h2>Em breve!</h2>
                        <p>Esta funcionalidade estará disponível em uma atualização futura.</p>
                    </div>
                );
            default:
                return <Planning />;
        }
    };

    return (
        <div className={`main-page ${darkTheme ? "dark-theme" : ""}`}>
            <Nav
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={handleLogout}
                darkTheme={darkTheme}
                toggleTheme={toggleTheme}
                isAdmin={isAdmin}
            />

            <main className="main-container">
                {renderActiveSection()}
            </main>
        </div>
    );
};

export default MainPage;