// Abas de status + busca (contratos e pagamentos).\nh-auto flex-wrap pq no celular as abas quebram linha.

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";

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
