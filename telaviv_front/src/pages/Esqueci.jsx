import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

// Importações de assets e CSS (reutilizando o CSS do Login)
import logo from "../assets/logo2.png";
import loginImage from "../assets/esqueceusenha.jpg"; // A mesma imagem da tela de login
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css"; // <<-- REUTILIZANDO O CSS DA PÁGINA DE LOGIN

// Importações de componentes e helpers
import AlertMessage, { alert } from "@alert";
import UrlAtual from "@urlAtual";

const Esqueci = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
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
    if (!email || emailError) {
      alert.warning("Por favor, preencha um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${UrlAtual()}/api/recuperarPassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
        alert.success(
          "E-mail de recuperação enviado! Verifique sua caixa de entrada."
        );
        setTimeout(() => navigate("/"), 4000);
      } else {
        alert.error(data.message || "Erro ao enviar e-mail de recuperação.");
      }
    } catch (error) {
      console.error("Erro ao recuperar senha:", error);
      alert.error("Erro de conexão. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid vh-100 p-0">
      <AlertMessage />
      <div className="row g-0 h-100">
        {/* Coluna do Formulário (Esquerda) */}
        <div className="col-lg-5 col-md-6 col-12 d-flex flex-column justify-content-center align-items-center form-column">
          <div className="login-card">
            <div className="text-center mb-4">
              <img src={logo} alt="Logo" className="login-logo mb-3" />
              <h2 className="mt-3 fw-bold d-block d-lg-none">
                Esqueceu sua senha?
              </h2>
              <p className="text-muted d-block d-lg-none">
                Sem problemas! Digite seu e-mail e enviaremos um link para você
                redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className={`form-control ${emailError ? "is-invalid" : ""}`}
                  placeholder="Digite o e-mail cadastrado"
                  required
                  value={email}
                  onChange={handleEmailChange}
                />
                {emailError && (
                  <div className="invalid-feedback">{emailError}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold py-2"
                disabled={loading || !!emailError}
              >
                {loading ? "Enviando..." : "Enviar Link de Recuperação"}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link
                to="/"
                className="text-decoration-none small d-flex align-items-center justify-content-center"
              >
                <FaArrowLeft className="me-2" />
                Voltar para o Login
              </Link>
            </div>
          </div>
        </div>

        {/* Coluna da Imagem (Direita) */}
        <div
          className="col-lg-7 col-md-6 d-none d-md-block image-column"
          style={{ backgroundImage: `url(${loginImage})` }}
        />
      </div>
    </div>
  );
};

export default Esqueci;
