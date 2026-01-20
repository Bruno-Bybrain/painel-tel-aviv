import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./Components/contexts/AuthContext.jsx";
import ProtectedRoute from "./Components/ProtectedRoute/ProtectedRoute.jsx";
import App from "./App.jsx";
import Esqueci from "./pages/Esqueci.jsx";
import Recuperar from "./pages/Recuperar.jsx";
import Logado from "./pages/Logado.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Usuarios from "./pages/Usuarios.jsx";
import Log from "./pages/Log.jsx";
import Provisionamento from "./pages/Provisionamento.jsx";
import Rentabilidade from "./pages/Rentabilidade.jsx";
import Efetivo from "./pages/Efetivo.jsx";
import Maracana from "./pages/Maracana.jsx";
import Caixa from "./pages/Caixa.jsx";
import Nexti from "./pages/Nexti.jsx";
import Beneficios from "./pages/Beneficios.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // Rota da página de Login
  },
  {
    path: "/esquecisenha",
    element: <Esqueci />,
  },
  {
    path: "/recuperar/:codigo",
    element: <Recuperar />,
  },

  // --- ROTAS PROTEGIDAS ---
  {
    path: "/logado",
    element: <ProtectedRoute />,
    children: [
      {
        element: <Logado />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: "usuarios",
            element: (
              <ProtectedRoute allowedRoles={["administrador"]}>
                <Usuarios />
              </ProtectedRoute>
            ),
          },
          {
            path: "nexti",
            element: (
              <ProtectedRoute allowedRoles={["administrador"]}>
                <Nexti />
              </ProtectedRoute>
            ),
          },
          {
            path: "maracana",
            element: (
              <ProtectedRoute
                allowedRoles={[
                  "administrador",
                  "diretor",
                  "idt",
                  "financeiro",
                  "rh",
                  "operacao",
                ]}
              >
                <Maracana />
              </ProtectedRoute>
            ),
          },
          {
            path: "caixa",
            element: (
              <ProtectedRoute
                allowedRoles={["administrador", "diretor", "idt", "financeiro"]}
              >
                <Caixa />
              </ProtectedRoute>
            ),
          },
          {
            path: "efetivo",
            element: (
              <ProtectedRoute
                allowedRoles={[
                  "administrador",
                  "diretor",
                  "idt",
                  "financeiro",
                  "rh",
                  "operacao",
                ]}
              >
                <Efetivo />
              </ProtectedRoute>
            ),
          },
                    {
            path: "beneficios",
            element: (
              <ProtectedRoute
                allowedRoles={[
                  "administrador",
                  "diretor",
                  "idt",
                  "financeiro",
                  "rh",
                  "operacao",
                ]}
              >
                <Beneficios />
              </ProtectedRoute>
            ),
          },
          {
            path: "provisionamento",
            element: (
              <ProtectedRoute
                allowedRoles={["administrador", "diretor", "idt", "financeiro"]}
              >
                <Provisionamento />
              </ProtectedRoute>
            ),
          },
          {
            path: "rentabilidade",
            element: (
              <ProtectedRoute
                allowedRoles={["administrador", "diretor", "idt", "financeiro"]}
              >
                <Rentabilidade />
              </ProtectedRoute>
            ),
          },
          {
            path: "log",
            element: (
              <ProtectedRoute allowedRoles={["administrador"]}>
                <Log />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
