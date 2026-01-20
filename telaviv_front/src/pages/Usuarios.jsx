import React, { useEffect, useState, useCallback } from "react";
import {
  Button,
  Modal,
  Form,
  Table,
  Row,
  Col,
  FormControl,
  Pagination,
  Badge,
  Spinner,
} from "react-bootstrap";
import { FaPlus, FaSearch, FaEdit, FaTimes } from "react-icons/fa";
import UrlAtual from "../Components/Url/urlAtual.jsx";
import Alert, { alert } from "../Components/Alert/Alert.jsx";
import "./Usuarios.css";
import { useAuth } from "../Components/contexts/AuthContext.jsx";

const FiltrosAtivosDisplay = ({ filtros, onRemover }) => {
  const nomesFiltros = {
    busca: "Busca",
    status: "Status",
    role: "Perfil",
  };
  const filtrosParaMostrar = Object.entries(filtros)
    .map(([chave, valor]) => ({ chave, valor }))
    .filter((f) => f.valor);

  if (filtrosParaMostrar.length === 0) {
    return null;
  }
  return (
    <div className="filtros-ativos-container">
      {filtrosParaMostrar.map(({ chave, valor }) => (
        <div key={chave} className="filtro-tag">
          <span className="filtro-label">
            <strong> {nomesFiltros[chave]}:</strong>{" "}
            {valor.charAt(0).toUpperCase() + valor.slice(1)}
          </span>
          <button
            type="button"
            className="btn-remover-filtro"
            aria-label={`Remover filtro ${nomesFiltros[chave]}`}
            onClick={() => onRemover(chave)}
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("access_token");

  const [filtros, setFiltros] = useState({
    busca: "",
    status: "",
    role: "",
  });
  const [filtrosAtivos, setFiltrosAtivos] = useState(filtros);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [showModalCriar, setShowModalCriar] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState(null);
  const [loadingAcao, setLoadingAcao] = useState(false);

  const [todosPerfis, setTodosPerfis] = useState([]);
  const [perfisPermitidos, setPerfisPermitidos] = useState([]);

  const [novoUsuario, setNovoUsuario] = useState({
    username: "",
    email: "",
    telefone: "",
    role: "",
    status: true,
  });

  const HIERARQUIA = {
    administrador: 5,
    diretor: 4,
    idt: 3,
    financeiro: 3,
    rh: 3,
    operacao: 2,
  };

  useEffect(() => {
    const fetchPerfis = async () => {
      try {
        const response = await fetch(`${UrlAtual()}/api/usuarios/perfis`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setTodosPerfis(data);

          if (user && user.role) {
            const nivelUsuarioAtual = HIERARQUIA[user.role] || 0;
            // <-- LÓGICA CORRIGIDA (>=)
            // Permite que o usuário veja perfis de nível igual ou inferior.
            const perfisFiltrados = data.filter((perfil) => {
              const nivelPerfil = HIERARQUIA[perfil] || 0;
              return nivelUsuarioAtual >= nivelPerfil;
            });
            setPerfisPermitidos(perfisFiltrados);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar perfis:", error);
      }
    };
    fetchPerfis();
  }, [user, token]);

  const fetchUsuarios = useCallback(() => {
    setLoading(true);
    const query = new URLSearchParams({
      pagina: paginaAtual,
      per_page: itensPorPagina,
    });
    if (filtrosAtivos.busca.trim())
      query.append("busca", filtrosAtivos.busca.trim());
    if (filtrosAtivos.status) query.append("status", filtrosAtivos.status);
    if (filtrosAtivos.role)
      query.append("role", filtrosAtivos.role.toLowerCase());

    fetch(`${UrlAtual()}/api/usuarios?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUsuarios(data.usuarios || []);
        setTotalPaginas(data.totalPaginas || 1);
      })
      .catch((err) => {
        console.error("Erro ao buscar usuários:", err);
        alert.error("Não foi possível carregar os usuários.");
      })
      .finally(() => setLoading(false));
  }, [filtrosAtivos, paginaAtual, token, itensPorPagina]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleAplicarFiltros = (e) => {
    e.preventDefault();
    setPaginaAtual(1);
    setFiltrosAtivos(filtros);
  };

  const handleLimparFiltros = () => {
    const filtrosIniciais = { busca: "", status: "", role: "" };
    setPaginaAtual(1);
    setFiltros(filtrosIniciais);
    setFiltrosAtivos(filtrosIniciais);
  };

  const handleRemoverFiltro = (chaveDoFiltro) => {
    const novosFiltros = { ...filtros, [chaveDoFiltro]: "" };
    setPaginaAtual(1);
    setFiltros(novosFiltros);
    setFiltrosAtivos(novosFiltros);
  };

  const handleAbrirModalCriar = () => {
    setNovoUsuario({
      username: "",
      email: "",
      telefone: "",
      role: "",
      status: true,
    });
    setShowModalCriar(true);
  };

  const handleAbrirModalEditar = (usuario) => {
    setUsuarioParaEditar({
      ...usuario,
      telefone: usuario.telefone || "",
      role: usuario.role,
      status: usuario.status === "ativo",
    });
    setShowModalEditar(true);
  };

  const handleSalvarUsuario = async () => {
    const isEditing = !!usuarioParaEditar;
    const usuarioData = isEditing ? usuarioParaEditar : novoUsuario;
    if (
      !usuarioData.username.trim() ||
      !usuarioData.email.trim() ||
      !usuarioData.role
    ) {
      alert.warning("Nome, e-mail e perfil são obrigatórios.");
      return;
    }
    setLoadingAcao(true);
    const url = isEditing
      ? `${UrlAtual()}/api/usuarios/${usuarioData.id}`
      : `${UrlAtual()}/api/usuarios`;
    const method = isEditing ? "PUT" : "POST";

    const payload = {
      ...usuarioData,
      status: usuarioData.status ? "ativo" : "inativo",
      role: usuarioData.role,
    };
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert.success(
          data.msg || `Usuário ${isEditing ? "atualizado" : "criado"}!`
        );
        setShowModalCriar(false);
        setShowModalEditar(false);
        fetchUsuarios();
      } else {
        alert.warning(data.msg || "Ocorreu um erro.");
      }
    } catch (error) {
      alert.error("Erro de conexão ao salvar usuário.");
    } finally {
      setLoadingAcao(false);
    }
  };

  const handleToggleStatus = async (usuario) => {
    const novoStatus = !(usuario.status === "ativo");
    try {
      const res = await fetch(`${UrlAtual()}/api/usuarios/${usuario.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: novoStatus ? "ativo" : "inativo" }),
      });
      if (res.ok) {
        fetchUsuarios();
      } else {
        const errorData = await res.json();
        alert.warning(errorData.msg || "Ocorreu um erro desconhecido.");
      }
    } catch (error) {
      console.error("Erro de conexão ao atualizar status:", error);
      alert.error("Falha de conexão. Não foi possível atualizar o status.");
    }
  };

  const formatarTelefone = (value) => {
    if (!value) return "";
    value = value.replace(/\D/g, "");
    value = value.slice(0, 11);
    if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,5})/, "($1) $2");
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)/, "($1");
    }
    return value;
  };

  const renderModalCriarEditar = () => {
    const isEditing = showModalEditar;
    const modalTitle = isEditing ? "Editar Usuário" : "Criar Novo Usuário";
    const data = isEditing ? usuarioParaEditar : novoUsuario;
    const setData = isEditing ? setUsuarioParaEditar : setNovoUsuario;

    return (
      <Modal
        show={showModalCriar || showModalEditar}
        onHide={() => {
          setShowModalCriar(false);
          setShowModalEditar(false);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            id="usuario-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSalvarUsuario();
            }}
          >
            <Form.Group className="mb-3">
              <Form.Label>Nome Completo *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Digite o nome"
                value={data.username}
                onChange={(e) => setData({ ...data, username: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>E-mail *</Form.Label>
              <Form.Control
                type="email"
                placeholder="email@exemplo.com"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Telefone</Form.Label>
              <Form.Control
                type="tel"
                placeholder="(99) 99999-9999"
                value={data.telefone}
                maxLength="15"
                onChange={(e) => {
                  const valorFormatado = formatarTelefone(e.target.value);
                  setData({ ...data, telefone: valorFormatado });
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Perfil de Acesso *</Form.Label>
              <Form.Select
                value={data.role}
                onChange={(e) => setData({ ...data, role: e.target.value })}
                required
              >
                <option value="" disabled>
                  Selecione um perfil...
                </option>
                {perfisPermitidos.map((p) => (
                  <option key={p} value={p}>
                    {p === "idt"
                      ? "ID&T"
                      : p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowModalCriar(false);
              setShowModalEditar(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="usuario-form"
            disabled={loadingAcao}
          >
            {loadingAcao ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : (
              "Salvar"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const getProfileBadge = (role) => {
    let bg;
    let displayText = role
      ? role.charAt(0).toUpperCase() + role.slice(1)
      : "N/A";
    if (role === "idt") displayText = "ID&T";

    switch (role) {
      case "administrador":
        bg = "danger";
        break;
      case "diretor":
        bg = "warning";
        break;
      case "idt":
      case "financeiro":
      case "rh":
        bg = "primary";
        break;
      case "operacao":
      default:
        bg = "secondary";
    }
    return <Badge bg={bg}>{displayText}</Badge>;
  };

  return (
    <div className="usuarios-page-container">
      <Alert />
      <div className="page-header">
        <Button onClick={handleAbrirModalCriar} className="btn-create-user">
          <FaPlus className="me-2" /> Criar Usuário
        </Button>
      </div>

      <div className="card shadow-sm main-card">
        <div className="card-header bg-light p-3">
          <Form onSubmit={handleAplicarFiltros}>
            <Row className="g-3 align-items-end">
              <Col xs={12} md={4} lg={5}>
                <Form.Label>Buscar por nome ou e-mail</Form.Label>
                <FormControl
                  placeholder="Digite aqui para buscar..."
                  value={filtros.busca}
                  onChange={(e) =>
                    setFiltros({ ...filtros, busca: e.target.value })
                  }
                />
              </Col>
              <Col xs={6} md={3} lg={2}>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filtros.status}
                  onChange={(e) =>
                    setFiltros({ ...filtros, status: e.target.value })
                  }
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Form.Select>
              </Col>
              <Col xs={6} md={3} lg={3}>
                <Form.Label>Perfil</Form.Label>
                <Form.Select
                  value={filtros.role}
                  onChange={(e) =>
                    setFiltros({ ...filtros, role: e.target.value })
                  }
                >
                  <option value="">Todos os Perfis</option>
                  {todosPerfis.map((p) => (
                    <option key={p} value={p}>
                      {p === "idt"
                        ? "ID&T"
                        : p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={12} md={2} lg={2} className="d-flex mt-3 mt-md-0">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-grow-1 me-2"
                >
                  <FaSearch />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-grow-1"
                  onClick={handleLimparFiltros}
                >
                  Limpar
                </Button>
              </Col>
            </Row>
          </Form>
        </div>

        <FiltrosAtivosDisplay
          filtros={filtrosAtivos}
          onRemover={handleRemoverFiltro}
        />

        <div className="table-responsive">
          <Table className="m-0 usuarios-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Perfil</th>
                <th className="text-center">Status</th>
                <th>Data Cadastro</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                  </td>
                </tr>
              ) : usuarios.length > 0 ? (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td data-label="ID">{u.id}</td>
                    <td data-label="Nome">{u.username}</td>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Telefone">{u.telefone || "N/A"}</td>
                    <td data-label="Perfil">{getProfileBadge(u.role)}</td>
                    <td data-label="Status" className="text-center">
                      <Form.Check
                        type="switch"
                        id={`status-${u.id}`}
                        checked={u.status === "ativo"}
                        onChange={() => handleToggleStatus(u)}
                      />
                    </td>
                    <td data-label="Data Cadastro">
                      {u.data_cadastro
                        ? new Date(u.data_cadastro).toLocaleDateString("pt-BR")
                        : "N/A"}
                    </td>
                    <td data-label="Ações" className="text-center">
                      <Button
                        variant="link"
                        className="action-button edit-button"
                        size="sm"
                        onClick={() => handleAbrirModalEditar(u)}
                      >
                        <FaEdit />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center p-4 text-muted">
                    Nenhum usuário encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {totalPaginas > 1 && !loading && (
          <div className="card-footer d-flex justify-content-center">
            <Pagination>
              <Pagination.First
                onClick={() => setPaginaAtual(1)}
                disabled={paginaAtual === 1}
              />
              <Pagination.Prev
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
              />
              <Pagination.Item active>
                {paginaAtual} de {totalPaginas}
              </Pagination.Item>
              <Pagination.Next
                onClick={() =>
                  setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
                }
                disabled={paginaAtual === totalPaginas}
              />
              <Pagination.Last
                onClick={() => setPaginaAtual(totalPaginas)}
                disabled={paginaAtual === totalPaginas}
              />
            </Pagination>
          </div>
        )}
      </div>
      {renderModalCriarEditar()}
    </div>
  );
};

export default Usuarios;
