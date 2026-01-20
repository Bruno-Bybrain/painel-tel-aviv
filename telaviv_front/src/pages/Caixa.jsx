import React from "react";
import "./Provisionamento.css";

const Caixa = () => {
  // Link para o relatório do Microsoft Fabric (Power BI)
  const powerBiLink =
    "https://app.fabric.microsoft.com/view?r=eyJrIjoiYWVhY2E0OTUtMmRkNS00ODA3LTliMTAtYTJhY2M2MzAxYWUxIiwidCI6IjU2YWY2MmZiLTUwZjktNGZlZi04OTMxLTAzOTRlNzE5NDAyNSJ9";

  return (
    <div className="provisionamento-container">
      <iframe
        title="Relatório de Provisionamento"
        className="provisionamento-iframe"
        src={powerBiLink}
        frameBorder="0" // Remove a borda do iframe
        allowFullScreen // Permite que o iframe entre em tela cheia
      ></iframe>
    </div>
  );
};

export default Caixa;
