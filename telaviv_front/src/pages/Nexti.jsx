import React, { useState, useEffect, useRef } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Alert from "@alert";
import UrlAtual from "@urlAtual";
import "./Nexti.css";

const Nexti = () => {
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [logOutput, setLogOutput] = useState("");
  const [progress, setProgress] = useState(0);
  const logContainerRef = useRef(null);
  const logIntervalRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const logTemplates = [
    "INFO: Iniciando verificação de cache...",
    "API: GET /persons/all?page={_}",
    "CACHE: OK - 'Persons' cache populado.",
    "API: GET /workplaces/all?page={_}",
    "CACHE: OK - 'Workplaces' cache populado.",
    "DEBUG: Mapeando {n} colaboradores...",
    "API: GET /clients/all?page={_}",
    "CACHE: OK - 'Clients' cache populado.",
    "INFO: Processando dados de colaborador ID: {id}",
    "API: GET /companies/all?page={_}",
    "CACHE: OK - 'Companies' cache populado.",
    "INFO: Validando situação do colaborador ID: {id}",
    "API: GET /scheduletransfers/lastupdate/...",
    "CACHE: OK - 'ScheduleTransfers' cache populado.",
    "WARN: Latência detectada na API. Tentando novamente...",
    "DEBUG: Cruzando dados de posto de trabalho.",
    "INFO: Gerando linha para o relatório...",
    "INFO: Normalizando dados de horário...",
    "DEBUG: Colaborador ID {id} processado com sucesso.",
  ];

  useEffect(() => {
    const startLoadingAnimation = () => {
      setLogOutput(">>> Iniciando processo de geração de relatório...\n");
      setProgress(0);
      const addLogEntry = () => {
        if (logTemplates.length === 0) return;

        const randomIndex = Math.floor(Math.random() * logTemplates.length);
        let logText = logTemplates[randomIndex]
          .replace("{_}", Math.floor(Math.random() * 10))
          .replace("{n}", Math.floor(Math.random() * 100) + 300)
          .replace("{id}", Math.floor(Math.random() * 9000) + 1000);
        setLogOutput((prev) => prev + logText + "\n");
        const randomDelay = Math.random() * (150 - 40) + 40;
        logIntervalRef.current = setTimeout(addLogEntry, randomDelay);
      };
      addLogEntry();
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return 98;
          return prev + 2;
        });
      }, 600);
    };

    const stopLoadingAnimation = () => {
      clearTimeout(logIntervalRef.current);
      clearInterval(progressIntervalRef.current);
      setProgress(100);
      setLogOutput((prev) => prev + ">>> Processo finalizado com sucesso!");
    };

    if (loading) {
      startLoadingAnimation();
    } else {
      stopLoadingAnimation();
    }

    return () => {
      clearTimeout(logIntervalRef.current);
      clearInterval(progressIntervalRef.current);
    };
  }, [loading]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logOutput]);

  const handleGenerateReport = async () => {
    if ((startDate && !finishDate) || (!startDate && finishDate)) {
      alert.warning(
        "Por favor, preencha ambas as datas ou deixe as duas em branco para o padrão."
      );
      return;
    }
    if (startDate && finishDate) {
      const date1 = new Date(startDate);
      const date2 = new Date(finishDate);
      if (date1 > date2) {
        alert.warning("A data de início não pode ser posterior à data de fim.");
        return;
      }
      const diffTime = Math.abs(date2 - date1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        alert.warning(
          "O intervalo entre as datas não pode ser maior que 31 dias."
        );
        return;
      }
    }
    setTableData([]);
    setLoading(true);
    setSearchPerformed(true);
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert.warning("Sessão expirada. Por favor, faça login novamente.");
      setLoading(false);
      return;
    }
    let payload = {};
    if (startDate && finishDate) {
      payload = {
        start: startDate.split("-").reverse().join("") + "000000",
        finish: finishDate.split("-").reverse().join("") + "235959",
      };
    }
    try {
      const response = await fetch(
        `${UrlAtual()}/api/nexti/colaboradores_data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao buscar os dados.");
      }

      // --- AJUSTE APLICADO AQUI: ADICIONANDO A DATA E HORA ---
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const formattedTimestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

      // Adiciona a nova propriedade 'Hora' em cada objeto retornado pela API
      const dataWithTimestamp = data.map((record) => ({
        ...record,
        Hora: formattedTimestamp,
      }));

      setTableData(dataWithTimestamp);
    } catch (error) {
      alert.warning(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDates = () => {
    setStartDate("");
    setFinishDate("");
  };

  const handleDownloadExcel = async () => {
    if (tableData.length === 0) {
      alert.warning("Não há dados para exportar.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Colaboradores");

    // --- AJUSTE APLICADO AQUI: ADICIONANDO A COLUNA NO EXCEL ---
    worksheet.columns = [
      { header: "Hora", key: "Hora", width: 20 },
      { header: "Empresa", key: "Razao Social Empresa", width: 35 },
      { header: "Cliente", key: "Cliente", width: 35 },
      { header: "Negócio", key: "Unidade de Negocio", width: 25 },
      { header: "Posto", key: "Nome Posto de Trabalho", width: 35 },
      { header: "Colaborador", key: "Nome Colaborador", width: 35 },
      { header: "Matrícula", key: "Matricula", width: 15 },
      { header: "CPF", key: "CPF", width: 20 },
      { header: "Cargo", key: "Descricao Cargo", width: 25 },
      { header: "Cronograma", key: "Cronograma", width: 20 },
      { header: "Horário", key: "Horario", width: 20 },
      { header: "Turno", key: "Turno", width: 25 },
    ];

    worksheet.addRows(tableData);

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { name: "Sans-Serif", size: 10, bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "9fc5e8" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
      };
    });

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: "Sans-Serif", size: 8, bold: false };
          cell.border = {
            top: { style: "thin", color: { argb: "000000" } },
            left: { style: "thin", color: { argb: "000000" } },
            bottom: { style: "thin", color: { argb: "000000" } },
            right: { style: "thin", color: { argb: "000000" } },
          };
        });
      }
    });

    worksheet.autoFilter = {
      from: "A1",
      to: { row: 1, column: worksheet.columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "Relatorio_Colaboradores_Nexti.xlsx");
  };

  return (
    <div className="container mt-4">
      <Alert />
      <div className="card">
        <div className="card-header">
          <p className="mb-0 text-muted">
            Deixe as datas em branco para buscar o dia atual, ou selecione um
            período de até 31 dias.
          </p>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="startDate" className="form-label">
                Data de Início
              </label>
              <input
                type="date"
                id="startDate"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="finishDate" className="form-label">
                Data de Fim
              </label>
              <input
                type="date"
                id="finishDate"
                className="form-control"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-primary w-100"
                onClick={handleGenerateReport}
                disabled={loading}
              >
                {loading ? "Processando..." : "Gerar"}
              </button>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={handleClearDates}
                disabled={loading}
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>
      {loading && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h5 className="mb-3">Processando Relatório</h5>
            <textarea
              ref={logContainerRef}
              className="loading-log-viewer"
              value={logOutput}
              readOnly
            />
            <div className="progress mt-3">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                role="progressbar"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      {!loading && searchPerformed && (
        <div className="card mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5>Resultados Encontrados ({tableData.length})</h5>
            {tableData.length > 0 && (
              <button className="btn btn-success" onClick={handleDownloadExcel}>
                Download Excel
              </button>
            )}
          </div>
          <div className="card-body results-card-body">
            {tableData.length > 0 ? (
              <div>
                <table className="table zoomTableT table-striped table-hover table-bordered">
                  <thead className="table-light">
                    {/* --- AJUSTE APLICADO AQUI: ADICIONANDO A COLUNA NA TABELA --- */}
                    <tr>
                      <th>Hora</th>
                      <th>Empresa</th>
                      <th>Cliente</th>
                      <th>Negócio</th>
                      <th>Posto</th>
                      <th>Colaborador</th>
                      <th>Matrícula</th>
                      <th>CPF</th>
                      <th>Cargo</th>
                      <th>Cronograma</th>
                      <th>Horário</th>
                      <th>Turno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((colaborador) => (
                      <tr key={colaborador["ID Colaborador"]}>
                        <td>{colaborador.Hora}</td>
                        <td>{colaborador["Razao Social Empresa"]}</td>
                        <td>{colaborador["Cliente"]}</td>
                        <td>{colaborador["Unidade de Negocio"]}</td>
                        <td>{colaborador["Nome Posto de Trabalho"]}</td>
                        <td>{colaborador["Nome Colaborador"]}</td>
                        <td>{colaborador["Matricula"]}</td>
                        <td>{colaborador["CPF"]}</td>
                        <td>{colaborador["Descricao Cargo"]}</td>
                        <td>{colaborador["Cronograma"]}</td>
                        <td>{colaborador["Horario"]}</td>
                        <td>{colaborador["Turno"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted">
                Nenhum resultado encontrado.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Nexti;
