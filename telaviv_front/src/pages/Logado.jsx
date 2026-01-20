import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";
import { LuChartColumnBig } from "react-icons/lu";
import { RiAdminLine } from "react-icons/ri";
import logo from "../assets/logo1.png";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Logado.css";
import Alert from "@alert";
import { useAuth } from "../Components/contexts/AuthContext.jsx";
import { IoMdList } from "react-icons/io";
import { BiSpreadsheet } from "react-icons/bi";
import { MdAttachMoney } from "react-icons/md";
import { BsFileSpreadsheet } from "react-icons/bs";

const Logado = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [openSubmenus, setOpenSubmenus] = useState({});

  // Função para abrir/fechar um submenu
  const handleSubmenuToggle = (menuId) => {
    setOpenSubmenus((prev) => ({
      // Mantém o estado dos outros submenus e inverte o do que foi clicado
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const allMenuItems = [
    {
      id: "Dashboard",
      path: "/logado",
      icon: <LuChartColumnBig className="color_icones_menu" />,
      label: "Dashboard",
      allowedRoles: [
        "administrador",
        "diretor",
        "idt",
        "financeiro",
        "rh",
        "operacao",
      ],
    },
    {
      id: "Inteligência Operacional",
      icon: <BiSpreadsheet className="color_icones_menu" />,
      label: "Inteligência Operacional",
      allowedRoles: [
        "administrador",
        "diretor",
        "idt",
        "financeiro",
        "operacao",
        "rh",
      ],
      // Sub-itens para o menu
      subItems: [
        {
          id: "Efetivo",
          path: "/logado/efetivo",
          label: "Efetivo",
        },
        {
          id: "Maracana",
          path: "/logado/maracana",
          label: "Maracanã",
        },
        {
          id: "Beneficios",
          path: "/logado/beneficios",
          label: "Beneficios",
        }
      ],
    },
    {
      id: "Inteligência Financeira",
      icon: <MdAttachMoney className="color_icones_menu" />,
      label: "Inteligência Financeira",
      allowedRoles: ["administrador", "diretor", "idt", "financeiro"],
      // Sub-itens para o menu
      subItems: [
        {
          id: "Rentabilidade Caixa",
          path: "/logado/Caixa",
          label: "Rentabilidade Caixa",
        },
        {
          id: "Rentabilidade Competência",
          path: "/logado/rentabilidade",
          label: "Rentabilidade Competência",
        },
        {
          id: "Provisionamento",
          path: "/logado/provisionamento",
          label: "Provisionamento",
        },
      ],
    },
    {
      id: "ETL",
      icon: <BiSpreadsheet className="color_icones_menu" />,
      label: "ETL",
      allowedRoles: ["administrador"],
      // Sub-itens para o menu
      subItems: [
        {
          id: "Nexti",
          path: "/logado/nexti",
          icon: <BsFileSpreadsheet className="color_icones_menu" />,
          label: "Nexti",
          allowedRoles: [
            "administrador",
            "diretor",
            "idt",
            "financeiro",
            "rh",
            "operacao",
          ],
        },
      ],
    },
    {
      id: "Log",
      path: "/logado/log",
      icon: <IoMdList className="color_icones_menu" />,
      label: "Logs",
      allowedRoles: ["administrador"],
    },

    {
      id: "Usuários",
      path: "/logado/usuarios",
      icon: <RiAdminLine className="color_icones_menu" />,
      label: "Usuários",
      allowedRoles: ["administrador"],
    },
  ];

  useEffect(() => {
    const currentPath = location.pathname;

    // Procura no menu principal ou nos submenus pelo item ativo
    let currentMenuItem = allMenuItems.find(
      (item) => item.path === currentPath
    );
    if (!currentMenuItem) {
      for (const item of allMenuItems) {
        if (item.subItems) {
          const foundSubItem = item.subItems.find(
            (sub) => sub.path === currentPath
          );
          if (foundSubItem) {
            currentMenuItem = foundSubItem;
            break;
          }
        }
      }
    }

    if (currentMenuItem) {
      setPageTitle(currentMenuItem.label);
    } else {
      setPageTitle("Painel");
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setSidebarOpen(width >= 992);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return null;
  }

  const visibleMenuItems = allMenuItems.filter((item) =>
    item.allowedRoles.includes(user.role)
  );

  return (
    <div
      className={`dashboard-container ${
        sidebarOpen && windowWidth < 992 ? "menu-mobile-aberto" : ""
      }`}
    >
      <Alert />
      <div
        className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      >
        <div className="sidebar-header">
          {sidebarOpen ? (
            <img src={logo} className="sidebar-logo" alt="Logo" />
          ) : (
            <div className="sidebar-logo-small">C</div>
          )}
        </div>
        <div className="sidebar-menu">
          {visibleMenuItems.map((item) => {
            // Se o item tiver sub-itens, ele se torna um menu dropdown
            if (item.subItems) {
              const isOpen = openSubmenus[item.id] || false;
              // Verifica se um dos sub-itens está ativo para manter o menu pai destacado
              const isSubmenuActive = item.subItems.some((subItem) =>
                location.pathname.startsWith(subItem.path)
              );

              return (
                <div key={item.id}>
                  <div
                    className={`sidebar-menu-item ${
                      isSubmenuActive ? "active" : ""
                    }`}
                    onClick={() => handleSubmenuToggle(item.id)}
                  >
                    <div className="sidebar-icon">{item.icon}</div>
                    {sidebarOpen && (
                      <span className="sidebar-label">{item.label}</span>
                    )}
                    {sidebarOpen && (
                      <span className={`submenu-arrow ${isOpen ? "open" : ""}`}>
                        &#9662;
                      </span>
                    )}
                  </div>
                  {/* Renderiza o container do submenu se estiver aberto */}
                  {isOpen && sidebarOpen && (
                    <div className="submenu-container">
                      {item.subItems.map((subItem) => (
                        <NavLink
                          key={subItem.id}
                          to={subItem.path}
                          className="submenu-item"
                          onClick={(e) => {
                            // Impede que o clique no sub-item feche o menu pai
                            e.stopPropagation();
                            if (windowWidth < 992) {
                              setSidebarOpen(false);
                            }
                          }}
                        >
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Renderização normal para itens sem sub-itens
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === "/logado"}
                className="sidebar-menu-item"
                onClick={() => {
                  if (windowWidth < 992) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <div className="sidebar-icon">{item.icon}</div>
                {sidebarOpen && (
                  <span className="sidebar-label">{item.label}</span>
                )}
              </NavLink>
            );
          })}

          <div className="sidebar-menu-item" onClick={handleLogout}>
            <div className="sidebar-icon">
              <IoCloseSharp className="color_icones_menu" />
            </div>
            {sidebarOpen && <span className="sidebar-label">Sair</span>}
          </div>
        </div>
      </div>

      {sidebarOpen && windowWidth < 992 && (
        <div className="overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      <div className="main-content">
        <header className="dashboard-header">
          <div className="d-flex align-items-center">
            {windowWidth < 992 && (
              <button
                className="menu-toggle-btn me-3"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <FaBars />
              </button>
            )}
            <h1 className="page-title mb-0">{pageTitle}</h1>
          </div>
          <div className="ms-auto d-flex align-items-center">
            <span className="me-2">Olá, {user.username}</span>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Logado;
