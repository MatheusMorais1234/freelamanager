// ============================================================
// FilterBar - abas de status com contagem + campo de busca
// ------------------------------------------------------------
// POR QUE EXISTE: a barra era identica em Contratos e
// Pagamentos, linha por linha; so mudavam a lista de status e o
// texto do placeholder.
//
// E consertava um defeito de layout: ui/tabs.jsx fixa a altura
// da TabsList em h-8 (via group-data-horizontal). No celular as
// cinco abas com contagem quebram para uma segunda linha e,
// presas em 32px, ficavam cortadas. "h-auto flex-wrap" deixa a
// lista crescer junto com o conteudo.
// ============================================================

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";

/**
 * @param {string}   value      aba ativa ("ALL" ou um status)
 * @param {Function} onChange
 * @param {string[]} options    os status, sem o "ALL" (ele entra sozinho)
 * @param {object}   labels     { STATUS: "Rotulo" }
 * @param {object}   counts     { ALL: n, STATUS: n }
 * @param {string}   search
 * @param {Function} onSearch   recebe o texto ja pronto, nao o evento
 * @param {string}   placeholder
 */
export function FilterBar({
  value,
  onChange,
  options = [],
  labels = {},
  counts = {},
  search = "",
  onSearch,
  placeholder = "Buscar...",
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <Tabs value={value} onValueChange={onChange}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="ALL">Todos ({counts.ALL ?? 0})</TabsTrigger>
          {options.map((s) => (
            <TabsTrigger key={s} value={s}>
              {labels[s] ?? s} ({counts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative max-w-sm lg:w-72">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
    </div>
  );
}

export default FilterBar;
