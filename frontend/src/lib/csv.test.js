
import { describe, it, expect } from "vitest";

import { paraCSV } from "./csv.js";

describe("paraCSV", () => {
  it("monta cabecalho e linhas na ordem das chaves", () => {
    const csv = paraCSV([
      { Cliente: "Ana", Total: "100.00" },
      { Cliente: "Bruno", Total: "250.50" },
    ]);

    expect(csv).toBe("Cliente;Total\r\nAna;100.00\r\nBruno;250.50");
  });

  it("usa ponto e virgula, e nao virgula", () => {
    const csv = paraCSV([{ a: "1", b: "2" }]);

    expect(csv.split("\r\n")[0]).toBe("a;b");
  });

  it("termina as linhas com CRLF", () => {
    const csv = paraCSV([{ a: "1" }, { a: "2" }]);

    expect(csv).toContain("\r\n");
    expect(csv.split("\r\n")).toHaveLength(3); // cabecalho + 2
  });

  it("protege o campo que contem o separador", () => {
    const csv = paraCSV([{ Cliente: "Silva; Souza e Cia", Total: "10" }]);

    expect(csv).toBe('Cliente;Total\r\n"Silva; Souza e Cia";10');
  });

  it("duplica as aspas de dentro do texto", () => {
    const csv = paraCSV([{ Nome: 'Bar do "Ze"' }]);

    expect(csv).toBe('Nome\r\n"Bar do ""Ze"""');
  });

  it("protege o campo com quebra de linha", () => {
    const csv = paraCSV([{ Obs: "primeira\nsegunda" }]);

    expect(csv).toBe('Obs\r\n"primeira\nsegunda"');
  });

  it("transforma ausencia em celula vazia, nao em 'null'", () => {
    const csv = paraCSV([{ a: null, b: undefined, c: "ok" }]);

    expect(csv).toBe("a;b;c\r\n;;ok");
  });

  it("mantem o zero, que nao e ausencia", () => {
    // zero tem que aparecer
    const csv = paraCSV([{ Recebido: 0 }]);

    expect(csv).toBe("Recebido\r\n0");
  });

  it("devolve texto vazio quando nao ha linhas", () => {
    expect(paraCSV([])).toBe("");
    expect(paraCSV(null)).toBe("");
    expect(paraCSV(undefined)).toBe("");
  });

  it("aceita outro separador quando pedido", () => {
    const csv = paraCSV([{ a: "1", b: "2" }], ",");

    expect(csv).toBe("a,b\r\n1,2");
  });
});
