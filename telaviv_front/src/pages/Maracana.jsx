import React from "react";
import "./Provisionamento.css";

const Maracana = () => {
  // Link para o relatório do Microsoft Fabric (Power BI)
  const powerBiLink =
    "https://app.fabric.microsoft.com/view?r=eyJrIjoiMjVmZTg3OWQtOTIzZi00MjVlLWJjNmEtZmNlNjVlMTdlYWM1IiwidCI6IjU2YWY2MmZiLTUwZjktNGZlZi04OTMxLTAzOTRlNzE5NDAyNSJ9&pageName=b4c5416004eae63b0d43";

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

export default Maracana;
