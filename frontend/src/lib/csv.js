// Export CSV no navegador

function celula(valor) {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor);

  if (/[";\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }

  return texto;
}

// Separador ";" porque o Excel pt-BR usa virgula como decimal
export function paraCSV(linhas, separador = ";") {
  if (!linhas || linhas.length === 0) return "";

  const colunas = Object.keys(linhas[0]);

  const cabecalho = colunas.map(celula).join(separador);
  const corpo = linhas.map((linha) =>
    colunas.map((coluna) => celula(linha[coluna])).join(separador)
  );

  return [cabecalho, ...corpo].join("\r\n");
}

// BOM na frente pro Excel abrir os acentos certo
export function baixarCSV(nomeDoArquivo, conteudo) {
  const blob = new Blob([`﻿${conteudo}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeDoArquivo;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
