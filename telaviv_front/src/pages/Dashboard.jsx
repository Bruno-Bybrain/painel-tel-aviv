import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const Dashboard = () => {
  return (
    <div className="container mt-5">
      <h2 className="mb-4 text-center">Solicitações</h2>
      <p className="text-center mb-5">
        Bem-vindo ao painel Tel Aviv! Acesse abaixo as solicitações disponíveis para facilitar:
      </p>

      <div className="row g-4 justify-content-center">
        {/* Solicitações Financeiras */}
        <div className="col-12 col-md-4">
          <a
            href="https://forms.clickup.com/9013205948/f/8ckn6xw-9453/XCJPNT2GAJT2QYBZ9Q"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            <div className="card shadow-sm text-center p-4 h-100 hover-card">
              <h5 className="mb-3 text-primary-emphasis">💰 Solicitações Financeiras</h5>
              <p className="text-muted mb-0">
                Preencha o formulário para solicitações financeiras.
              </p>
            </div>
          </a>
        </div>

        {/* Formulário Reposições */}
        <div className="col-12 col-md-4">
          <a
            href="https://forms.gle/eQf3D7Sj1PtvfnG59"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            <div className="card shadow-sm text-center p-4 h-100 hover-card">
              <h5 className="mb-3 text-primary-emphasis">🔄 Formulário Reposições</h5>
              <p className="text-muted mb-0">
                Preencha o formulário para reposições em caso de falta do colaborador.
              </p>
            </div>
          </a>
        </div>

        {/* Formulário Extra */}
        <div className="col-12 col-md-4">
          <a
            href="https://forms.gle/cHFE2fVFT3aD9LJA8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            <div className="card shadow-sm text-center p-4 h-100 hover-card">
              <h5 className="mb-3 text-primary-emphasis">💲 Formulário Extra</h5>
              <p className="text-muted mb-0">
                Preencha o formulário para solicitar diárias extras para um determinado posto.
              </p>
            </div>
          </a>
        </div>
        {/* Formulário Movimentações Operacionais */}
        <div className="col-12 col-md-4">
          <a
            href="https://forms.clickup.com/9013205948/f/8ckn6xw-9813/QK3QEZJU4BBRA3G3KY"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            <div className="card shadow-sm text-center p-4 h-100 hover-card">
              <h5 className="mb-3 text-primary-emphasis">⇄ Movimentações Operacionais</h5>
              <p className="text-muted mb-0">
                Preencha o formulário para realizar movimentações operacionais no Nexti. <br />
                Exemplo: Novas Adimissões, Troca de Posto, Alteração de Horário, etc.
              </p>
            </div>
          </a>
        </div>
        {/* Requerimento de vaga */}
        <div className="col-12 col-md-4">
          <a
            href="https://forms.gle/nt4ApwVcDWqSpBKLA"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            <div className="card shadow-sm text-center p-4 h-100 hover-card">
              <h5 className="mb-3 text-primary-emphasis">👔 Requisição de Vagas</h5>
              <p className="text-muted mb-0">
                Preencha o formulário para realizar requisição de vagas.<br />
                ⚠️ Importante: O formulário deve ser preenchido pela gestão ou coordenação, garantindo que os dados sejam os mais fiéis e precisos possíveis.
              </p>
            </div>
          </a>
        </div>
        {/* tratativas de solicitações de DP */}
        <div className="col-12 col-md-4">
          <a
            href="https://forms.clickup.com/9013205948/f/8ckn6xw-6853/CNT21T9JP97MJPFTBC"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            <div className="card shadow-sm text-center p-4 h-100 hover-card">
              <h5 className="mb-3 text-primary-emphasis">📌 Reclamações – Folha ou Benefícios</h5>
              <p className="text-muted mb-0">
                Preencha o formulário para realizar reclamações ao DP.<br />
                ⚠️ Importante: A devolutiva (solução ou resposta ao colaborador) será enviada exclusivamente via NEXTI.
              </p>
            </div>
          </a>
        </div>
      </div>

      <style>{`
        .hover-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }
        .hover-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

