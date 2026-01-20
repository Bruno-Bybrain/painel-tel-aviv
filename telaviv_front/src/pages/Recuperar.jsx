import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

// Importações de assets e CSS
import logo from "../assets/logo2.png";
import loginImage from "../assets/recuperar.jpg";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

// Importações de componentes e helpers
import AlertMessage, { alert } from "@alert";
import UrlAtual2 from "@urlAtual";

const CriterioSenha = ({ valido, texto }) => (
  <li
    className={`d-flex align-items-center ${
      valido ? "text-success" : "text-muted"
    }`}
  >
    {valido ? (
      <FaCheckCircle className="me-2" />
    ) : (
      <FaTimesCircle className="me-2" />
    )}
    {texto}
  </li>
);

const Recuperar = () => {
  const navigate = useNavigate();
  const { codigo } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[!@#$%^&*()]/.test(password),
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  useEffect(() => {
    if (confirmPassword.length > 0 && password !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      alert.warning("A senha deve atender a todos os critérios de segurança.");
      return;
    }
    if (password !== confirmPassword) {
      alert.warning("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${UrlAtual2()}/api/savenewpassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, tokena2: codigo }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert.success("Senha alterada com sucesso! Você será redirecionado.");
        setTimeout(() => navigate("/"), 4000);
      } else {
        alert.error(
          data.message || "Erro ao redefinir a senha. O link pode ter expirado."
        );
      }
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
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
                Redefina sua Senha
              </h2>
              <p className="text-muted d-block d-lg-none">
                Crie uma nova senha segura para sua conta.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label">Nova Senha</label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Crie uma nova senha"
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

              <div className="mb-3">
                <label className="form-label">Confirmar Senha</label>
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control ${
                      passwordError ? "is-invalid" : ""
                    }`}
                    placeholder="Confirme a nova senha"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <span
                    className="input-group-text"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowPassword(!showPassword)} // O mesmo controle para ambos
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                  {passwordError && (
                    <div className="invalid-feedback">{passwordError}</div>
                  )}
                </div>
              </div>

              <div className="mb-4 small">
                <p className="mb-2 text-muted">Sua senha precisa ter:</p>
                <ul className="list-unstyled">
                  <CriterioSenha
                    valido={passwordCriteria.length}
                    texto="Pelo menos 8 caracteres"
                  />
                  <CriterioSenha
                    valido={passwordCriteria.uppercase}
                    texto="Uma letra maiúscula"
                  />
                  <CriterioSenha
                    valido={passwordCriteria.lowercase}
                    texto="Uma letra minúscula"
                  />
                  <CriterioSenha
                    valido={passwordCriteria.number}
                    texto="Um número"
                  />
                  <CriterioSenha
                    valido={passwordCriteria.specialChar}
                    texto="Um caractere especial (!@#$...)"
                  />
                </ul>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold py-2"
                disabled={loading || !isPasswordValid || !!passwordError}
              >
                {loading ? "Salvando..." : "Redefinir Senha"}
              </button>
            </form>
          </div>
        </div>

        <div
          className="col-lg-7 col-md-6 d-none d-md-block image-column"
          style={{ backgroundImage: `url(${loginImage})` }}
        />
      </div>
    </div>
  );
};

export default Recuperar;
