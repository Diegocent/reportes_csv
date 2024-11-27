"use client";

import React, { useState, useEffect, useMemo } from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { addDays } from "date-fns";
import { DateRangePicker } from "./DateRangePicker";
import { FileUpload } from "./FileUpload";
import {
  calculateWorkingDays,
  calculateWorkingHours,
} from "./utils/calcularHorasDias";
import { parseCsvManually } from "./utils/parseCsv";
import { exportToExcel } from "./utils/exportExcel";

type FileData = { [key: string]: string | number | null };

export default function Dashboard() {
  const [fileData, setFileData] = useState<FileData[]>([]);
  const [columns, setColumns] = useState<ColumnDef<FileData, unknown>[]>([]);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [holidayInput, setHolidayInput] = useState("");
  const [sprintFilter, setSprintFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const defaultVisibleColumns = [
    "Resumen",
    "Campo personalizado (Actual start)",
    "Resuelta",
    "Persona asignada",
    "Estado",
    "Sprint",
    "diasLaborales",
    "horasLaborales",
  ];
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () =>
      defaultVisibleColumns.reduce((acc, col) => {
        acc[col] = true;
        return acc;
      }, {} as VisibilityState)
  );
  const [rowSelection, setRowSelection] = useState({});
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      alert("No se seleccionó ningún archivo.");
      return;
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        console.log("Contenido del archivo:", csvContent);

        try {
          // Procesar el contenido del archivo
          const parsedData = parseCsvManually(csvContent);
          console.log("Datos CSV procesados:", parsedData);

          if (parsedData.length > 0) {
            setFileData(parsedData);
            createColumns(Object.keys(parsedData[0])); // Crear columnas dinámicamente
          } else {
            alert("El archivo CSV no contiene datos válidos.");
          }
        } catch (error) {
          console.error("Error procesando el archivo CSV:", error);
          alert("Hubo un error al procesar el archivo CSV.");
        }
      };

      reader.onerror = () => {
        alert("Error leyendo el archivo.");
      };

      reader.readAsText(file); // Leer el archivo como texto
    } else {
      alert("Por favor, suba un archivo en formato CSV.");
    }
  };

  const createColumns = (headers: string[]) => {
    const cols: ColumnDef<FileData, unknown>[] = headers.map((header) => ({
      accessorKey: header,
      id: header,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {header}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue(header)}</div>,
      filterFn: (row, columnId, filterValue) => {
        const cellValue =
          row.getValue(columnId)?.toString()?.toLowerCase() ?? "";
        return cellValue.includes(filterValue.toLowerCase());
      },
    }));

    // Agregar columnas calculadas si están en las columnas visibles por defecto
    if (defaultVisibleColumns.includes("diasLaborales")) {
      cols.push({
        accessorKey: "diasLaborales",
        id: "diasLaborales",
        header: "Días laborales",
        cell: ({ row }) => {
          const startDate = row.getValue(
            "Campo personalizado (Actual start)"
          ) as Date | null;
          const endDate = row.getValue("Resuelta") as Date | null;
          return calculateWorkingDays(startDate, endDate, holidays);
        },
      });
    }

    if (defaultVisibleColumns.includes("horasLaborales")) {
      cols.push({
        accessorKey: "horasLaborales",
        id: "horasLaborales",
        header: "Horas laborales",
        cell: ({ row }) => {
          const startDate = row.getValue(
            "Campo personalizado (Actual start)"
          ) as Date | null;
          const endDate = row.getValue("Resuelta") as Date | null;
          return calculateWorkingHours(startDate, endDate, holidays);
        },
      });
    }

    setColumns(cols);

    // Sincronizar visibilidad de columnas
    setColumnVisibility(() =>
      headers.reduce((acc, header) => {
        acc[header] = defaultVisibleColumns.includes(header);
        return acc;
      }, {} as VisibilityState)
    );
  };

  const addHoliday = () => {
    const date = new Date(holidayInput + "T00:00:00"); // Se asegura la fecha correcta en la zona local
    if (!isNaN(date.getTime())) {
      setHolidays([...holidays, date]);
      setHolidayInput("");
    } else {
      alert("Por favor, ingresa una fecha válida");
    }
  };

  const removeHoliday = (index: number) => {
    setHolidays(holidays.filter((_, i) => i !== index));
  };

  const filteredData = useMemo(() => {
    return fileData.filter((row) => {
      // Extraer fechas de la fila
      const startDate = row["Campo personalizado (Actual start)"]
        ? new Date(row["Campo personalizado (Actual start)"])
        : null;
      const endDate = row["Resuelta"] ? new Date(row["Resuelta"]) : null;

      // Validar si la fecha de inicio cae dentro del rango (si el rango está definido)
      const matchesDateRange =
        (!startDate ||
          (startDate >= dateRange.from && startDate <= dateRange.to)) &&
        (!endDate || endDate <= dateRange.to);

      // Validar si el Sprint incluye el filtro (si el filtro está definido)
      const matchesSprint =
        !sprintFilter || // Si no hay filtro, siempre es verdadero
        (row["Sprint"]?.toString()?.toLowerCase() ?? "").includes(
          sprintFilter.toLowerCase()
        );

      // Incluir todo si no hay condiciones o si se cumplen las existentes
      return matchesDateRange && matchesSprint;
    });
  }, [fileData, dateRange, sprintFilter]);

  const totalHours = useMemo(() => {
    const total = filteredData.reduce((sum, row) => {
      const startDate = new Date(
        String(row["Campo personalizado (Actual start)"] ?? "")
      );
      const endDate = new Date(row["Resuelta"] ?? "");

      const hours = parseFloat(
        calculateWorkingHours(startDate, endDate, holidays)
      );

      return isNaN(hours) ? sum : sum + hours;
    }, 0);

    return parseFloat(total.toFixed(2));
  }, [filteredData, holidays]);

  // Function to export filtered data to Excel with selected columns

  const table = useReactTable({
    data: filteredData, // Usa datos filtrados
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  return (
    <div className="container mx-auto p-4 overflow-x-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Datos</h1>
      <FileUpload handleFileUpload={handleFileUpload} />

      <div className="mb-6 w-full max-w-md">
        <label
          htmlFor="holiday-input"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Agregar días feriados
        </label>
        <div className="flex space-x-2">
          <Input
            id="holiday-input"
            type="date"
            value={holidayInput}
            onChange={(e) => setHolidayInput(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={addHoliday}>Agregar Feriado</Button>
        </div>
        {holidays.length > 0 && (
          <div className="mt-2">
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              Feriados agregados:
            </h3>
            <ul className="list-disc list-inside">
              {holidays.map((holiday, index) => (
                <li key={index} className="flex items-center">
                  {holiday.toLocaleDateString()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHoliday(index)}
                    className="ml-2 text-red-500"
                  >
                    x
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {fileData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4">
            <Input
              placeholder="Filtrar por descripcion..."
              value={
                (table.getColumn("Resumen")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("Resumen")?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
            <Input
              placeholder="Filtrar por Sprint..."
              value={sprintFilter}
              onChange={(e) => setSprintFilter(e.target.value)}
              className="max-w-sm"
            />
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columnas <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table.getAllColumns().map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={columnVisibility[column.id] ?? false}
                    onCheckedChange={(value) =>
                      setColumnVisibility((prev) => ({
                        ...prev,
                        [column.id]: value,
                      }))
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <Button
              onClick={() =>
                exportToExcel(
                  columns,
                  columnVisibility,
                  filteredData,
                  holidays,
                  totalHours
                )
              }
              variant="outline"
              className="mb-2"
            >
              Exportar a Excel
            </Button>
            <p>Total de horas laborales: {totalHours} hrs</p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No hay resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} de{" "}
              {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
            </div>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Filas por página</p>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
