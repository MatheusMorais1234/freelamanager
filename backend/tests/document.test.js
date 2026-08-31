// ============================================================
// Digito verificador de CPF e CNPJ
// ------------------------------------------------------------
// Nao ha banco nem HTTP aqui: e funcao pura entrando e saindo.
// Por isso este arquivo roda em milissegundos e e o primeiro a
// acusar se a regra quebrar.
// ============================================================

import { describe, it, expect } from "vitest";

import {
  onlyDigits,
  isValidCPF,
  isValidCNPJ,
  isValidDocument,
} from "../src/lib/document.js";

describe("onlyDigits", () => {
  it("descarta a pontuacao", () => {
    expect(onlyDigits("123.456.789-00")).toBe("12345678900");
    expect(onlyDigits("19.131.243/0001-97")).toBe("19131243000197");
  });

  it("aguenta valor ausente sem quebrar", () => {
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
  });
});

describe("isValidCPF", () => {
  it("aceita CPF valido, com ou sem mascara", () => {
    expect(isValidCPF("390.533.447-05")).toBe(true);
    expect(isValidCPF("39053344705")).toBe(true);
  });

  it("recusa um digito verificador trocado", () => {
    // Mesmo CPF acima, so o ultimo digito alterado. E este o
    // erro que so contar caracteres deixaria passar.
    expect(isValidCPF("39053344706")).toBe(false);
  });

  it("recusa a quantidade errada de digitos", () => {
    expect(isValidCPF("3905334470")).toBe(false);
    expect(isValidCPF("390533447050")).toBe(false);
    expect(isValidCPF("")).toBe(false);
  });

  it("recusa digitos repetidos, que passam no calculo mas nao existem", () => {
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("00000000000")).toBe(false);
  });
});

describe("isValidCNPJ", () => {
  it("aceita CNPJ valido, com ou sem mascara", () => {
    expect(isValidCNPJ("19.131.243/0001-97")).toBe(true);
    expect(isValidCNPJ("19131243000197")).toBe(true);
  });

  it("recusa um digito verificador trocado", () => {
    expect(isValidCNPJ("19131243000198")).toBe(false);
  });

  it("recusa digitos repetidos e tamanho errado", () => {
    expect(isValidCNPJ("11111111111111")).toBe(false);
    expect(isValidCNPJ("1913124300019")).toBe(false);
  });
});

describe("isValidDocument", () => {
  it("cobra o documento do tipo certo do cliente", () => {
    expect(isValidDocument("39053344705", "PERSON")).toBe(true);
    expect(isValidDocument("19131243000197", "COMPANY")).toBe(true);
  });

  it("recusa CNPJ no lugar de CPF e vice-versa", () => {
    expect(isValidDocument("19131243000197", "PERSON")).toBe(false);
    expect(isValidDocument("39053344705", "COMPANY")).toBe(false);
  });
});
