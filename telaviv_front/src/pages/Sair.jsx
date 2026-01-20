import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Sair = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Limpa localStorage
    localStorage.clear();

    // Limpa os cookies
    document.cookie.split("; ").forEach((cookie) => {
      const [name] = cookie.split("=");
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
    });

    // Redireciona para a página inicial automaticamente
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default Sair;
