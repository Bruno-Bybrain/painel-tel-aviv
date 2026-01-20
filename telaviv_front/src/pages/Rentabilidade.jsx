import React from "react";
import "./Rentabilidade.css";

const Rentabilidade = () => {
  // Link para o relatório de Rentabilidade do Microsoft Fabric
  const powerBiLink =
    "https://app.fabric.microsoft.com/view?r=eyJrIjoiODA4OWMyMjItMmU4Ny00ZTJkLWI3N2ItNTk5MjhjMjBjMjY1IiwidCI6IjU2YWY2MmZiLTUwZjktNGZlZi04OTMxLTAzOTRlNzE5NDAyNSJ9";

  return (
    <div className="rentabilidade-container">
      <iframe
        title="Relatório de Rentabilidade"
        className="rentabilidade-iframe"
        src={powerBiLink}
        frameBorder="0" // Remove a borda do iframe
        allowFullScreen // Permite que o iframe entre em tela cheia
      ></iframe>
    </div>
  );
};

export default Rentabilidade;
