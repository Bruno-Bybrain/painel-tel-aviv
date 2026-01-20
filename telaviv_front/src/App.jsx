import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./Components/contexts/AuthContext.jsx";

import { FaEye, FaEyeSlash } from "react-icons/fa";
// 🔴 reCAPTCHA DESATIVADO PARA TESTES
// import ReCAPTCHA from "react-google-recaptcha";

// Importações de assets e CSS
import logo from "./assets/logo2.png";
import loginImage from "./assets/login.png";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

// Importações de componentes e helpers
import AlertMessage, { alert } from "./Components/Alert/Alert.jsx";
import UrlAtual from "./Components/Url/urlAtual.jsx";

const App = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

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

    setLoading(true);
    try {
      const response = await fetch(`${UrlAtual()}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      let result = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { message: text };
      }


      if (response.ok && result.access_token) {
        alert.success("Login bem-sucedido! Redirecionando...");

        login(result.access_token);
        navigate("/logado");
      } else {
        alert.warning(result.message || "Credenciais inválidas.");
      }
    } catch (error) {
      console.error("Erro na requisição de login:", error);
      alert.error("Não foi possível conectar ao servidor.");
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

              {/* 🔴 reCAPTCHA REMOVIDO TEMPORARIAMENTE */}

              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold py-2"
                disabled={loading}
              >
                {loading ? "Acessando..." : "Acessar"}
              </button>
            </form>

            <div className="text-center mt-3">
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

export default App;
