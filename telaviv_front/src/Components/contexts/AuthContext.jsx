import React, { createContext, useState, useEffect, useContext } from "react";
import { jwtDecode } from "jwt-decode";

// Cria o contexto que será usado pelos componentes
const AuthContext = createContext(null);

// Cria o Provedor, que é o componente que vai gerenciar e fornecer o estado
export const AuthProvider = ({ children }) => {
  // Inicializa o token pegando do localStorage, se existir
  const [token, setToken] = useState(() =>
    localStorage.getItem("access_token")
  );
  const [user, setUser] = useState(null);
  // Estado de 'loading' para sabermos quando a verificação inicial do token terminou
  const [loading, setLoading] = useState(true);

  // Este useEffect é executado sempre que o token muda ou na primeira vez que o app carrega
  useEffect(() => {
    try {
      if (token) {
        const decodedUser = jwtDecode(token);

        // Valida se o token não expirou
        if (decodedUser.exp * 1000 > Date.now()) {
          // Se o token é válido, definimos os dados do usuário no estado
          setUser({
            id: decodedUser.sub, // 'sub' é o padrão para ID do usuário em JWT
            role: decodedUser.role,
            username: decodedUser.username,
          });
        } else {
          // Se o token expirou, limpamos tudo
          localStorage.removeItem("access_token");
          setToken(null);
          setUser(null);
        }
      } else {
        // Se não há token, o usuário é nulo
        setUser(null);
      }
    } catch (error) {
      // Se o token for malformado ou inválido, limpamos tudo
      console.error("Erro ao decodificar token:", error);
      setUser(null);
      setToken(null);
      localStorage.removeItem("access_token");
    } finally {
      // Independentemente do resultado, o carregamento inicial termina aqui
      setLoading(false);
    }
  }, [token]); // A dependência é o token

  // Função para ser chamada pela página de login
  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem("access_token", newToken);
  };

  // Função para ser chamada pelo botão de sair
  const logout = () => {
    setToken(null);
    localStorage.removeItem("access_token");
  };

  // Os valores que serão disponibilizados para toda a aplicação
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user, // Um booleano prático para checar se está logado
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook customizado para facilitar o uso do contexto nos componentes
export const useAuth = () => {
  return useContext(AuthContext);
};
