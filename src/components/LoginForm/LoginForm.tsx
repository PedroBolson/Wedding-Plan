// src/components/LoginForm.tsx
import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/config";
import { useNavigate } from "react-router-dom";
import "./LoginForm.css";

const LoginForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/main");
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleResetPassword = async () => {
        setError("");
        setInfo("");
        if (!email) {
            setError("Por favor, informe seu e-mail para redefinir a senha.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setInfo("E-mail de recuperação enviado com sucesso!");
        } catch (err: any) {
            setError("Erro ao enviar e-mail. Verifique se o endereço está correto.");
        }
    };

    return (
        <div className="login-form-container">
            <form onSubmit={handleLogin}>
                <h2>Login</h2>
                <div className="form-group">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button className="login-btn" type="submit">Entrar</button>

                <div className="forgot-password">
                    <button type="button" onClick={handleResetPassword}>
                        Esqueci minha senha
                    </button>
                </div>

                {error && <p className="error-message">{error}</p>}
                {info && <p className="info-message">{info}</p>}
            </form>
        </div>
    );
};

export default LoginForm;