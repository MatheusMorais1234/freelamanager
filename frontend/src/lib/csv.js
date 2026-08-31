// ============================================================
// Exportacao para CSV
// ------------------------------------------------------------
// O arquivo e montado no navegador, com dados que a tela ja
// tem. Nao ha ida ao servidor: seria uma segunda consulta para
// buscar exatamente o que ja esta na memoria.
//
// Duas armadilhas classicas resolvidas aqui:
//   1. o campo que contem o proprio separador (ponto e virgula,
//      aspas ou quebra de linha) e que, sem escape, desloca a
//      planilha inteira uma coluna para o lado;
//   2. o acento que o Excel exibe errado quando o arquivo nao
//      declara a codificacao.
// ============================================================

/**
 * Escapa um valor para caber numa celula.
 *
 * A regra do formato CSV: se o texto contem o separador, aspas
 * ou quebra de linha, ele vai entre aspas - e as aspas de
 * dentro viram aspas duplicadas.
 */
function celula(valor) {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor);

  if (/[";\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }

  return texto;
}

/**
 * Transforma uma lista de objetos em texto CSV. As chaves do
 * primeiro objeto viram o cabecalho, na ordem em que aparecem.
 *
 * O separador padrao e ";" (e nao ",") porque o Excel em
 * portugues usa a virgula como separador DECIMAL: com ",", o
 * valor "1.234,56" seria quebrado em duas colunas.
 */
export function paraCSV(linhas, separador = ";") {
  if (!linhas || linhas.length === 0) return "";

  const colunas = Object.keys(linhas[0]);

  const cabecalho = colunas.map(celula).join(separador);
  const corpo = linhas.map((linha) =>
    colunas.map((coluna) => celula(linha[coluna])).join(separador)
  );

  // \r\n e o fim de linha que o formato CSV especifica e que
  // todas as planilhas entendem, inclusive no Windows.
  return [cabecalho, ...corpo].join("\r\n");
}

/**
 * Entrega o arquivo ao usuario.
 *
 * O "﻿" na frente e o BOM (marca de ordem de byte): sem
 * ele, o Excel abre o arquivo como se fosse da codificacao
 * antiga do Windows e "São Paulo" vira "SÃ£o Paulo".
 */
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

  // Limpeza: o link sai do documento e a URL temporaria e
  // liberada. Sem o revoke, o blob ficaria preso na memoria
  // ate a aba ser fechada.
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
