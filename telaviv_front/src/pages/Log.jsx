import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Pagination,
  Spinner,
  Form,
  Row,
  Col,
  Button,
  FormControl,
} from "react-bootstrap";
import { FaSearch, FaTimes } from "react-icons/fa";
import UrlAtual from "../Components/Url/urlAtual.jsx";
import Alert, { alert } from "../Components/Alert/Alert.jsx";
import "./Usuarios.css"; // Continuar usando Usuarios.css para consistência
import "./Log.css"; // Continuar usando Log.css para consistência

// Importar useAuth para verificar o perfil do usuário
import { useAuth } from "../Components/contexts/AuthContext.jsx"; //

// Perfis que terão acesso à página de Logs
const PERFIS_DE_ACESSO_LOGS = [
  "administrador",
  "diretor",
  "idt",
  "financeiro",
  "rh",
  "operacao",
];

// Componente para exibir os filtros ativos
const FiltrosAtivosDisplay = ({ filtros, onRemover }) => {
  const nomesFiltros = {
    busca: "Busca",
    data_de: "Data De",
    data_ate: "Data Até",
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
            <strong>{nomesFiltros[chave]}:</strong> {valor}
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

const Log = () => {
  const { user, loading: authLoading } = useAuth(); // Obter user e authLoading do contexto
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("access_token");

  // Estado para os filtros do formulário
  const [filtros, setFiltros] = useState({
    busca: "",
    data_de: "",
    data_ate: "",
  });
  // Estado para os filtros que são realmente aplicados na requisição (para quando limpar ou remover tags)
  const [filtrosAtivos, setFiltrosAtivos] = useState(filtros);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);

  // Verificação de acesso: true se o usuário existe e o perfil dele está na lista PERFIS_DE_ACESSO_LOGS
  const possuiAcesso = user && PERFIS_DE_ACESSO_LOGS.includes(user.role); //

  const fetchLogs = useCallback(() => {
    // Não tenta buscar logs se o usuário não tiver acesso
    if (!possuiAcesso) {
      //
      setLoading(false); //
      return; //
    }

    setLoading(true);
    const query = new URLSearchParams({
      page: paginaAtual,
      per_page: itensPorPagina,
    });
    if (filtrosAtivos.busca.trim())
      query.append("busca", filtrosAtivos.busca.trim());
    if (filtrosAtivos.data_de) query.append("data_de", filtrosAtivos.data_de);
    if (filtrosAtivos.data_ate)
      query.append("data_ate", filtrosAtivos.data_ate);

    fetch(`${UrlAtual()}/api/logs?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        // Captura o status 403 (Forbidden) do backend, se o token for válido mas o perfil não permitir
        if (res.status === 403) {
          //
          alert.error("Você não tem permissão para acessar os logs."); //
          setLogs([]); //
          setTotalPaginas(1); //
          setLoading(false); //
          return {}; // Retorna um objeto vazio para não quebrar a próxima promise .json()
        }
        return res.json();
      })
      .then((data) => {
        // Verifica se data e data.logs existem antes de setar o estado
        if (data && data.logs) {
          //
          setLogs(data.logs); //
          setTotalPaginas(
            Math.max(1, Math.ceil((data.total || 0) / itensPorPagina))
          );
        } else {
          //
          setLogs([]); // Se não houver logs ou a resposta for inesperada, limpa a lista
          setTotalPaginas(1); //
        }
      })
      .catch((err) => {
        console.error("Erro ao buscar logs:", err);
        alert.error("Não foi possível carregar os logs.");
        setLogs([]);
        setTotalPaginas(1);
      })
      .finally(() => setLoading(false));
  }, [filtrosAtivos, paginaAtual, token, itensPorPagina, possuiAcesso]); // Adiciona possuiAcesso como dependência

  useEffect(() => {
    // Só busca os logs depois que o estado de autenticação for carregado
    if (!authLoading) {
      //
      fetchLogs(); //
    }
  }, [fetchLogs, authLoading]); //

  const handleAplicarFiltros = (e) => {
    e.preventDefault(); // Evita o recarregamento da página
    setPaginaAtual(1); // Reinicia para a primeira página
    setFiltrosAtivos(filtros); // Aplica os filtros do formulário
  };

  const handleLimparFiltros = () => {
    const filtrosIniciais = { busca: "", data_de: "", data_ate: "" };
    setPaginaAtual(1);
    setFiltros(filtrosIniciais); // Limpa os campos do formulário
    setFiltrosAtivos(filtrosIniciais); // Limpa os filtros ativos para a busca
  };

  const handleRemoverFiltro = (chaveDoFiltro) => {
    const novosFiltrosForm = { ...filtros, [chaveDoFiltro]: "" };
    const novosFiltrosAtivos = { ...filtrosAtivos, [chaveDoFiltro]: "" };
    setPaginaAtual(1);
    setFiltros(novosFiltrosForm);
    setFiltrosAtivos(novosFiltrosAtivos);
  };

  // Formata a data para exibição
  const formatarData = (dataString) => {
    if (!dataString) return "N/A";
    const date = new Date(dataString);
    if (isNaN(date.getTime())) return "Data Inválida";
    // Formato dia/mês/ano hora:minuto:segundo, como na imagem
    return date.toLocaleString("pt-BR", {
      //
      day: "2-digit", //
      month: "2-digit", //
      year: "numeric", //
      hour: "2-digit", //
      minute: "2-digit", //
      second: "2-digit", //
      hour12: false, // Formato 24h
    });
  };

  // Se a autenticação ainda está carregando, mostra um spinner
  if (authLoading) {
    //
    return (
      <div
        className="usuarios-page-container d-flex justify-content-center align-items-center"
        style={{ height: "80vh" }}
      >
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Se não possui acesso, mostra mensagem de acesso negado
  if (!possuiAcesso) {
    //
    return (
      <div className="usuarios-page-container text-center p-5">
        <Alert /> {/* Pode ser uma boa ideia ter o Alert aqui também */}
        <h2 className="text-danger">Acesso Negado</h2>
        <p>Você não possui permissão para visualizar esta página.</p>
      </div>
    );
  }

  // Se possui acesso e não está carregando, renderiza o conteúdo normal da página
  return (
    <div className="usuarios-page-container">
      <Alert />

      <div className="card shadow-sm main-card">
        <div className="card-header bg-light p-3">
          <Form onSubmit={handleAplicarFiltros}>
            <Row className="g-3 align-items-end">
              {" "}
              <Col xs={12} md={4} lg={5}>
                {" "}
                <Form.Label>Buscar por mensagem</Form.Label>
                <FormControl
                  placeholder="Digite aqui para buscar..."
                  value={filtros.busca}
                  onChange={(e) =>
                    setFiltros({ ...filtros, busca: e.target.value })
                  }
                  className=""
                />
              </Col>
              {/* CAMPO DATA DE */}
              <Col xs={6} md={2} lg={2}>
                {" "}
                <Form.Label>Data De</Form.Label>
                <Form.Control
                  type="date"
                  className="date_height"
                  value={filtros.data_de}
                  onChange={(e) =>
                    setFiltros({ ...filtros, data_de: e.target.value })
                  }
                />
              </Col>
              {/* CAMPO DATA ATÉ */}
              <Col xs={6} md={2} lg={2}>
                {" "}
                <Form.Label>Data Até</Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.data_ate}
                  className="date_height"
                  onChange={(e) =>
                    setFiltros({ ...filtros, data_ate: e.target.value })
                  }
                />
              </Col>
              {/* BOTÕES DE BUSCAR E LIMPAR - Coluna final para eles */}
              <Col xs={12} md={2} className="d-flex mt-3 mt-md-0">
                {" "}
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-grow-1 me-2" // Adiciona margem à direita
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
            {" "}
            <thead>
              <tr>
                <th>ID</th>
                <th>Mensagem</th>
                <th>Data Cadastro</th>
                <th>Última Atualização</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td data-label="ID">{log.id}</td>
                    <td data-label="Mensagem">{log.mensagem}</td>
                    <td data-label="Data Cadastro">
                      {formatarData(log.data_cadastro)}
                    </td>
                    <td data-label="Última Atualização">
                      {log.update_cadastro
                        ? formatarData(log.update_cadastro)
                        : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-muted">
                    Nenhum log encontrado para os filtros aplicados.
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
    </div>
  );
};

export default Log;
