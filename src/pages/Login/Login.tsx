import LoginForm from "../../components/LoginForm/LoginForm";
import "./Login.css";

const LoginPage = () => {
    return (
        <div className="login-page">
            <div className="login-page-container">
                <div className="login-decoration login-decoration-1"></div>
                <div className="login-decoration login-decoration-2"></div>

                <div className="login-content">
                    <div className="login-logo">
                        <h1>Casamento <br /> Mari e Pedro</h1>
                        <p>Bem-vindo à plataforma de administração</p>
                    </div>
                    <LoginForm />
                </div>
            </div>
        </div>
    );
};

export default LoginPage;