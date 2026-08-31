// ============================================================
// Formatacao e mascaras
// ------------------------------------------------------------
// Estas funcoes ficam entre o banco (que guarda so digitos) e a
// tela (que mostra pontuacao). Um erro aqui nao derruba nada -
// so mostra o numero errado para o usuario, que e pior.
// ============================================================

import { describe, it, expect } from "vitest";

import {
  onlyDigits,
  formatMoney,
  formatMoneyShort,
  formatDate,
  toInputDate,
  daysUntil,
  formatCPF,
  formatCNPJ,
  formatDocument,
  formatPhone,
  formatZip,
  isValidCPF,
  isValidCNPJ,
  paidPercent,
  initials,
} from "./format.js";

/**
 * O formato de moeda do pt-BR usa espaco NAO separavel entre o
 * "R$" e o numero. Comparar com um espaco comum falharia por um
 * caractere invisivel - entao normalizamos antes de comparar.
 */
function semEspacoEstranho(texto) {
  return texto.replace(/ /g, " ");
}

describe("onlyDigits", () => {
  it("descarta tudo que nao for digito", () => {
    expect(onlyDigits("(11) 98765-4321")).toBe("11987654321");
    expect(onlyDigits("abc")).toBe("");
  });

  it("aguenta ausencia sem quebrar", () => {
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
  });
});

describe("formatMoney", () => {
  it("formata o valor que vem como string do backend", () => {
    // O backend manda "4500.75" (string) para nao perder
    // centavo; a conversao para numero acontece so aqui.
    expect(semEspacoEstranho(formatMoney("4500.75"))).toBe("R$ 4.500,75");
  });

  it("formata numero tambem", () => {
    expect(semEspacoEstranho(formatMoney(1234.5))).toBe("R$ 1.234,50");
  });

  it("mostra zero em vez de sumir quando o valor falta", () => {
    expect(semEspacoEstranho(formatMoney(null))).toBe("R$ 0,00");
    expect(semEspacoEstranho(formatMoney(undefined))).toBe("R$ 0,00");
  });

  it("formata valor negativo", () => {
    expect(semEspacoEstranho(formatMoney(-50))).toBe("-R$ 50,00");
  });
});

describe("formatMoneyShort", () => {
  it("encurta milhares e milhoes para caber no eixo do grafico", () => {
    expect(formatMoneyShort(12_500)).toBe("R$ 12.5 mil");
    expect(formatMoneyShort(2_300_000)).toBe("R$ 2.3 mi");
  });

  it("mantem valores pequenos inteiros", () => {
    expect(formatMoneyShort(750)).toBe("R$ 750");
    expect(formatMoneyShort(0)).toBe("R$ 0");
  });
});

describe("formatDate", () => {
  it("mostra a data no formato brasileiro", () => {
    expect(formatDate("2026-03-10")).toBe("10/03/2026");
  });

  it("nao escorrega um dia por causa do fuso", () => {
    // Sem timeZone UTC, um navegador em fuso negativo (o Brasil
    // inteiro) mostraria 31/12 para uma data de 01/01.
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
    expect(formatDate("2026-12-31")).toBe("31/12/2026");
  });

  it("mostra travessao quando nao ha data", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
  });
});

describe("toInputDate", () => {
  it("devolve o formato que o <input type=date> exige", () => {
    expect(toInputDate("2026-03-10T00:00:00.000Z")).toBe("2026-03-10");
  });

  it("devolve vazio quando nao ha data", () => {
    expect(toInputDate(null)).toBe("");
  });
});

describe("daysUntil", () => {
  // A funcao compara com a meia-noite de hoje, e as datas que
  // ela recebe na vida real vem da API como "AAAA-MM-DD" (sem
  // hora). Os testes usam o mesmo formato: passar um Date com
  // hora embutida faria o resultado variar conforme a hora em
  // que a suite roda.
  function emDias(offset) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  it("conta os dias que faltam", () => {
    expect(daysUntil(emDias(10))).toBe(10);
  });

  it("devolve negativo para prazo vencido", () => {
    expect(daysUntil(emDias(-5))).toBe(-5);
  });

  it("devolve zero no dia do vencimento", () => {
    // toBeCloseTo, e nao toBe: o arredondamento pode produzir
    // "-0", que e diferente de "+0" para o Object.is do toBe,
    // mas se comporta como zero em toda comparacao do app
    // ("-0 === 0" e verdadeiro, "-0 < 0" e falso).
    expect(daysUntil(emDias(0))).toBeCloseTo(0);
  });

  it("devolve nulo quando nao ha prazo", () => {
    expect(daysUntil(null)).toBeNull();
  });
});

describe("mascara de documento", () => {
  it("formata CPF", () => {
    expect(formatCPF("39053344705")).toBe("390.533.447-05");
  });

  it("formata CNPJ", () => {
    expect(formatCNPJ("19131243000197")).toBe("19.131.243/0001-97");
  });

  it("formata enquanto o usuario ainda esta digitando", () => {
    // A mascara nao pode esperar o campo estar completo: ela
    // acompanha a digitacao.
    expect(formatCPF("390")).toBe("390");
    expect(formatCPF("3905")).toBe("390.5");
    expect(formatCPF("390533")).toBe("390.533");
  });

  it("ignora o que passar do tamanho", () => {
    expect(formatCPF("39053344705999")).toBe("390.533.447-05");
    expect(formatCNPJ("19131243000197999")).toBe("19.131.243/0001-97");
  });

  it("escolhe a mascara pelo tipo do cliente", () => {
    expect(formatDocument("39053344705", "PERSON")).toBe("390.533.447-05");
    expect(formatDocument("19131243000197", "COMPANY")).toBe("19.131.243/0001-97");
    expect(formatDocument(null, "PERSON")).toBe("—");
  });
});

describe("mascara de telefone e CEP", () => {
  it("formata celular de 11 digitos", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("formata fixo de 10 digitos", () => {
    expect(formatPhone("1132145678")).toBe("(11) 3214-5678");
  });

  it("formata CEP", () => {
    expect(formatZip("01310100")).toBe("01310-100");
  });
});

describe("validacao (espelha o backend)", () => {
  it("confere o digito verificador do CPF", () => {
    expect(isValidCPF("390.533.447-05")).toBe(true);
    expect(isValidCPF("390.533.447-06")).toBe(false);
    expect(isValidCPF("111.111.111-11")).toBe(false);
  });

  it("confere o digito verificador do CNPJ", () => {
    expect(isValidCNPJ("19.131.243/0001-97")).toBe(true);
    expect(isValidCNPJ("19.131.243/0001-98")).toBe(false);
  });
});

describe("paidPercent", () => {
  it("calcula a fatia ja recebida", () => {
    expect(paidPercent(250, 1000)).toBe(25);
    expect(paidPercent(1000, 1000)).toBe(100);
  });

  it("trata contrato de valor zero como quitado, e nao como NaN", () => {
    // Contrato de valor zero existe (cortesia, permuta). Sem a
    // guarda, 0/0 viraria NaN e a barra de progresso sumiria da
    // tela. A escolha e 100%: nao ha nada a receber.
    expect(paidPercent(0, 0)).toBe(100);
    expect(paidPercent(0, null)).toBe(100);
  });

  it("mostra zero quando nada foi recebido de um contrato real", () => {
    expect(paidPercent(0, 1000)).toBe(0);
  });

  it("nao passa de 100 quando se recebe acima do combinado", () => {
    // Aditivo e hora extra sao legitimos, mas a barra nao pode
    // vazar para fora do cartao.
    expect(paidPercent(1500, 1000)).toBe(100);
  });
});

describe("initials", () => {
  it("monta as iniciais do avatar", () => {
    expect(initials("Matheus Morais")).toBe("MM");
  });

  it("usa as duas primeiras letras quando ha so um nome", () => {
    // Uma letra sozinha deixaria o avatar com cara de vazio.
    expect(initials("Matheus")).toBe("MA");
  });

  it("usa o primeiro e o ultimo nome, ignorando os do meio", () => {
    expect(initials("Ana Maria de Souza Lima")).toBe("AL");
  });

  it("aguenta ausencia sem quebrar o avatar", () => {
    expect(initials(null)).toBe("?");
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});
