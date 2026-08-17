// ============================================================
// Formulario de cliente - cadastro completo
// ------------------------------------------------------------
// Organizado em tres blocos (identificacao, contato, endereco)
// porque um formulario de 20 campos em coluna unica cansa e
// aumenta o erro de preenchimento.
//
// Os campos mudam conforme o tipo: pessoa fisica tem CPF e data
// de nascimento; pessoa juridica tem CNPJ, nome fantasia e
// inscricao estadual.
// ============================================================

import { useState } from "react";
import { Loader2, Search } from "lucide-react";

import { lookupZip } from "@/lib/cep.js";
import {
  formatCNPJ,
  formatCPF,
  formatPhone,
  formatZip,
  isValidDocument,
  onlyDigits,
  UF_LIST,
} from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

export const EMPTY_CLIENT = {
  type: "PERSON",
  name: "",
  company: "",
  document: "",
  stateRegistration: "",
  birthDate: "",
  email: "",
  phone: "",
  mobile: "",
  website: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  notes: "",
};

/** Rotulo de um bloco do formulario. */
function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <Separator className="flex-1" />
      </div>
      {children}
    </div>
  );
}

function Field({ label, htmlFor, error, hint, className, children }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function ClientForm({ form, setForm, onSubmit, onCancel, busy, error }) {
  const [zipLoading, setZipLoading] = useState(false);
  const [zipMessage, setZipMessage] = useState("");

  const isCompany = form.type === "COMPANY";

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Aplica a mascara enquanto o usuario digita, mantendo o
  // cursor no fim. O valor cru (so digitos) e reconstruido na
  // hora de enviar - a mascara nunca vai para o banco.
  const setMasked = (key, mask) => (e) =>
    setForm({ ...form, [key]: mask(e.target.value) });

  // Trocar de tipo limpa o documento: um CPF digitado nao vale
  // como CNPJ e deixa-lo la so geraria erro de validacao.
  function changeType(type) {
    setForm({
      ...form,
      type,
      document: "",
      stateRegistration: "",
      birthDate: "",
      company: type === "PERSON" ? "" : form.company,
    });
  }

  async function handleZipBlur() {
    const cep = onlyDigits(form.zipCode);
    if (cep.length !== 8) return;

    setZipLoading(true);
    setZipMessage("");

    const found = await lookupZip(cep);
    setZipLoading(false);

    if (!found) {
      setZipMessage("CEP não encontrado — preencha o endereço manualmente.");
      return;
    }

    // Nao sobrescreve o que o usuario ja preencheu na mao.
    setForm((prev) => ({
      ...prev,
      street: prev.street || found.street,
      district: prev.district || found.district,
      city: prev.city || found.city,
      state: prev.state || found.state,
    }));
  }

  const documentInvalid =
    form.document.length > 0 && !isValidDocument(form.document, form.type);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ---------------- Identificacao ---------------- */}
      <Section title="Identificação">
        <Tabs value={form.type} onValueChange={changeType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PERSON">Pessoa física</TabsTrigger>
            <TabsTrigger value="COMPANY">Pessoa jurídica</TabsTrigger>
          </TabsList>
        </Tabs>

        <Field label={isCompany ? "Razão social *" : "Nome completo *"} htmlFor="name">
          <Input
            id="name"
            required
            value={form.name}
            onChange={set("name")}
            placeholder={isCompany ? "Acme Serviços Ltda." : "Maria Souza"}
          />
        </Field>

        {isCompany && (
          <Field label="Nome fantasia" htmlFor="company">
            <Input
              id="company"
              value={form.company}
              onChange={set("company")}
              placeholder="Acme"
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isCompany ? "CNPJ" : "CPF"}
            htmlFor="document"
            error={documentInvalid ? "Documento inválido" : ""}
            hint="Opcional"
          >
            <Input
              id="document"
              inputMode="numeric"
              value={form.document}
              onChange={setMasked("document", isCompany ? formatCNPJ : formatCPF)}
              placeholder={isCompany ? "00.000.000/0000-00" : "000.000.000-00"}
              aria-invalid={documentInvalid}
            />
          </Field>

          {isCompany ? (
            <Field label="Inscrição estadual" htmlFor="ie">
              <Input
                id="ie"
                value={form.stateRegistration}
                onChange={set("stateRegistration")}
                placeholder="Isento"
              />
            </Field>
          ) : (
            <Field label="Data de nascimento" htmlFor="birthDate">
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={set("birthDate")}
              />
            </Field>
          )}
        </div>
      </Section>

      {/* ---------------- Contato ---------------- */}
      <Section title="Contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="contato@exemplo.com"
            />
          </Field>

          <Field label="Site" htmlFor="website">
            <Input
              id="website"
              value={form.website}
              onChange={set("website")}
              placeholder="exemplo.com.br"
            />
          </Field>

          <Field label="Telefone" htmlFor="phone">
            <Input
              id="phone"
              inputMode="tel"
              value={form.phone}
              onChange={setMasked("phone", formatPhone)}
              placeholder="(11) 3000-0000"
            />
          </Field>

          <Field label="Celular / WhatsApp" htmlFor="mobile">
            <Input
              id="mobile"
              inputMode="tel"
              value={form.mobile}
              onChange={setMasked("mobile", formatPhone)}
              placeholder="(11) 90000-0000"
            />
          </Field>
        </div>
      </Section>

      {/* ---------------- Endereco ---------------- */}
      <Section title="Endereço">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="CEP"
            htmlFor="zipCode"
            hint={zipMessage || "Preenche o resto sozinho"}
          >
            <div className="relative">
              <Input
                id="zipCode"
                inputMode="numeric"
                value={form.zipCode}
                onChange={setMasked("zipCode", formatZip)}
                onBlur={handleZipBlur}
                placeholder="00000-000"
                className="pr-9"
              />
              <span className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground">
                {zipLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </span>
            </div>
          </Field>

          <Field label="Rua" htmlFor="street" className="sm:col-span-2">
            <Input id="street" value={form.street} onChange={set("street")} />
          </Field>

          <Field label="Número" htmlFor="number">
            <Input id="number" value={form.number} onChange={set("number")} />
          </Field>

          <Field label="Complemento" htmlFor="complement">
            <Input
              id="complement"
              value={form.complement}
              onChange={set("complement")}
              placeholder="Sala 12"
            />
          </Field>

          <Field label="Bairro" htmlFor="district">
            <Input id="district" value={form.district} onChange={set("district")} />
          </Field>

          <Field label="Cidade" htmlFor="city" className="sm:col-span-2">
            <Input id="city" value={form.city} onChange={set("city")} />
          </Field>

          <Field label="UF" htmlFor="state">
            <Select
              value={form.state || undefined}
              onValueChange={(state) => setForm({ ...form, state })}
            >
              <SelectTrigger id="state" className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {UF_LIST.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      {/* ---------------- Observacoes ---------------- */}
      <Section title="Observações">
        <Textarea
          rows={3}
          value={form.notes}
          onChange={set("notes")}
          placeholder="Condições combinadas, forma de pagamento, contato preferido..."
        />
      </Section>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy || documentInvalid}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {busy ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
