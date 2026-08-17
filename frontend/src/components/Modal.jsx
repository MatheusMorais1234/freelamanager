// Janela flutuante usada pelos formularios de criar/editar.

import { useEffect } from "react";

export default function Modal({ title, onClose, children }) {
  // Fecha com a tecla Esc - acessibilidade basica.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // A funcao devolvida limpa o listener quando o modal some.
    // Sem isso, os listeners se acumulariam a cada abertura.
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* stopPropagation: clicar DENTRO do modal nao deve fecha-lo */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
