// src/pages/MainPage.tsx
import { useContext, useState, useEffect } from "react";
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

const MainPage = () => {
    const navigate = useNavigate();
    const { darkTheme, toggleTheme } = useContext(ThemeContext);
    const [activeSection, setActiveSection] = useState('planning');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        console.log("User data:", userData);
                        setIsAdmin(userData.role === "admin");
                    } else {
                        console.log("Documento de usuário não existe");
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Erro ao verificar status de admin:", error);
                    setIsAdmin(false);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsAdmin(false);
                setIsLoading(false);
                navigate("/login");
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleLogout = async () => {
        sessionStorage.removeItem('google_access_token');
        localStorage.removeItem('google_access_token');
        await signOut(auth);
        navigate("/login");
        window.location.reload();
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

    if (isLoading) {
        return <div className="loading">Carregando...</div>;
    }

    return (
        <div className={`main-page ${darkTheme ? "dark-theme" : ""}`}>
            <Nav
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onLogout={handleLogout}
                darkTheme={darkTheme}
                toggleTheme={toggleTheme}
                isAdmin={isAdmin} // Passa a propriedade isAdmin para o Nav
            />

            <main className="main-container">
                {renderActiveSection()}
            </main>
        </div>
    );
};

export default MainPage;