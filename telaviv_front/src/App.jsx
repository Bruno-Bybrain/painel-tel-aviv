import { useState } from "react";
// MUDANÇA 1: Importar 'Link' para navegação SPA e o hook 'useAuth'
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./Components/contexts/AuthContext.jsx";

import { FaEye, FaEyeSlash } from "react-icons/fa";
import ReCAPTCHA from "react-google-recaptcha";

// Importações de assets e CSS
import logo from "./assets/logo2.png";
import loginImage from "./assets/login.png";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// Importações de componentes e helpers
import AlertMessage, { alert } from "./Components/Alert/Alert.jsx";
import UrlAtual from "./Components/Url/urlAtual.jsx";

// MUDANÇA 2: O nome do componente deve ser 'App' para corresponder ao seu main.jsx
const App = () => {
  const navigate = useNavigate();

  // MUDANÇA 3: Obter a função 'login' do nosso contexto de autenticação
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaValue, setRecaptchaValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleCaptchaChange = (token) => {
    setRecaptchaValue(token);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail && !validateEmail(newEmail)) {
      setEmailError("Por favor, insira um e-mail válido.");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (emailError) {
      alert.warning("Por favor, corrija o e-mail antes de continuar.");
      return;
    }
    if (!email || !password) {
      alert.warning("Por favor, preencha e-mail e senha.");
      return;
    }
    // Lógica do reCAPTCHA está comentada, mantendo como no seu original
    if (!recaptchaValue) {
      alert.warning("Por favor, complete o reCAPTCHA.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${UrlAtual()}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, recaptcha: recaptchaValue }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert.success("Login bem-sucedido! Redirecionando...");

        // MUDANÇA 4: A LÓGICA CORRETA DE LOGIN
        // Em vez de salvar no localStorage manualmente, chamamos a função do contexto.
        // Isso atualiza o estado global e salva no localStorage de forma centralizada.
        login(result.access_token);

        // Após o estado ser atualizado, navegamos para a área logada.
        // O ProtectedRoute agora verá que estamos autenticados.
        navigate("/logado");
      } else {
        alert.warning(result.message || `Erro: ${response.status}`);
      }
    } catch (error) {
      console.error("Erro na requisição de login:", error);
      alert.error("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 p-0">
      <AlertMessage />
      <div className="row g-0 h-100">
        <div className="col-lg-5 col-md-6 col-12 d-flex flex-column justify-content-center align-items-center form-column">
          <div className="login-card">
            <div className="text-center mb-4">
              <img src={logo} alt="Logo da Empresa" className="login-logo" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className={`form-control ${emailError ? "is-invalid" : ""}`}
                  placeholder="seuemail@exemplo.com"
                  required
                  value={email}
                  onChange={handleEmailChange}
                />
                {emailError && (
                  <div className="invalid-feedback">{emailError}</div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label">Senha</label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Sua senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    className="input-group-text"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </div>

              <div className="mb-3 d-flex justify-content-center">
                <ReCAPTCHA
                  sitekey="6LeixmcrAAAAAKL8DGBeMC8NpWhTFZHqkaxj7wkG"
                  onChange={handleCaptchaChange}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold py-2"
                disabled={loading || !recaptchaValue}
              >
                {loading ? "Acessando..." : "Acessar"}
              </button>
            </form>

            <div className="text-center mt-3">
              {/* MUDANÇA 5: Usar o componente Link para uma navegação mais fluida */}
              <Link to="/esquecisenha" className="text-decoration-none small">
                Esqueceu sua senha?
              </Link>
            </div>
          </div>
        </div>

        <div
          className="col-lg-7 col-md-6 d-none d-md-block image-column"
          style={{ backgroundImage: `url(${loginImage})` }}
        ></div>
      </div>
    </div>
  );
};

// MUDANÇA 6: Exportando o componente com o nome correto 'App'
export default App;
