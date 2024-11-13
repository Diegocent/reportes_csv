"use client";

import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";

type FileData = { [key: string]: string };

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
    () => {
      return defaultVisibleColumns.reduce((acc, col) => {
        acc[col] = true;
        return acc;
      }, {} as VisibilityState);
    }
  );
  const [rowSelection, setRowSelection] = useState({});
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "csv") {
        Papa.parse(file, {
          worker: true, // Procesamiento en un worker para grandes cantidades de datos
          complete: (result) => {
            console.log("CSV Data:", result.data);
            const data = result.data as FileData[];
            setFileData(data);
            createColumns(Object.keys(data[0] || {}));
          },
          header: true,
        });
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as FileData[];
          console.log("Excel Data:", data);
          setFileData(data);
          createColumns(Object.keys(data[0] || {}));
        };
        reader.readAsBinaryString(file);
      } else {
        alert("Por favor, sube un archivo CSV o Excel (.xlsx, .xls)");
      }
    }
  };

  const createColumns = (headers: string[]) => {
    const cols: ColumnDef<FileData, unknown>[] = headers.map((header) => ({
      accessorKey: header,
      id: header,
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {header}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue(header)}</div>,
    }));

    cols.push(
      {
        accessorKey: "diasLaborales",
        id: "diasLaborales",
        header: "Días laborales",
        cell: ({ row }) => {
          const startDate = new Date(
            row.getValue("Campo personalizado (Actual start)")
          );
          let endDate = new Date(row.getValue("Resuelta"));
          if (isNaN(endDate.getTime())) {
            if (row.getValue("Estado") === "Finalizada") {
              endDate = new Date(row.getValue("Actualizada"));
            } else {
              return "N/A";
            }
          }
          return calculateWorkingDays(startDate, endDate);
        },
      },
      {
        accessorKey: "horasLaborales",
        id: "horasLaborales",
        header: "Horas laborales",
        cell: ({ row }) => {
          const startDate = new Date(
            row.getValue("Campo personalizado (Actual start)")
          );
          let endDate = new Date(row.getValue("Resuelta"));
          if (isNaN(endDate.getTime())) {
            if (row.getValue("Estado") === "Finalizada") {
              endDate = new Date(row.getValue("Actualizada"));
            } else {
              return "N/A";
            }
          }
          return calculateWorkingHours(startDate, endDate);
        },
      }
    );

    const initialVisibility = cols.reduce((acc, col) => {
      acc[col.id as string] = defaultVisibleColumns.includes(col.id as string);
      return acc;
    }, {} as VisibilityState);
    setColumnVisibility(initialVisibility);

    setColumns(cols);
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

  const calculateWorkingDays = (start: Date, end: Date) => {
    if (start >= end) return 0;

    let count = 0;
    const curDate = new Date(start);

    while (curDate <= end) {
      const dayOfWeek = curDate.getDay();
      const isHoliday = holidays.some(
        (h) => h.toDateString() === curDate.toDateString()
      );

      // Contar el día solo si es un día laboral (lunes a viernes) y no es feriado
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday) {
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    return count >= 1 && count * 8 >= 8 ? count : 0;
  };

  const calculateWorkingHours = (start: Date, end: Date) => {
    if (start >= end) return "0.00";

    const workHoursPerDay = 8; // Asumimos 8 horas de trabajo diarias
    let totalHours = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const isHoliday = holidays.some(
        (h) => h.toDateString() === currentDate.toDateString()
      );

      // Excluir fines de semana y feriados
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday) {
        if (
          currentDate.toDateString() === start.toDateString() &&
          currentDate.toDateString() === end.toDateString()
        ) {
          totalHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        } else if (currentDate.toDateString() === start.toDateString()) {
          const endOfDay = new Date(start);
          endOfDay.setHours(17, 0, 0, 0); // Fin del día laboral a las 17:00
          totalHours +=
            (endOfDay.getTime() - start.getTime()) / (1000 * 60 * 60);
        } else if (currentDate.toDateString() === end.toDateString()) {
          const startOfDay = new Date(end);
          startOfDay.setHours(9, 0, 0, 0); // Inicio del día laboral a las 9:00
          totalHours +=
            (end.getTime() - startOfDay.getTime()) / (1000 * 60 * 60);
        } else {
          totalHours += workHoursPerDay;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(9, 0, 0, 0); // Asegura que cada día comience a las 9:00
    }

    return totalHours.toFixed(2);
  };

  const filteredData = useMemo(() => {
    return fileData.filter((row) => {
      const startDate = new Date(row["Campo personalizado (Actual start)"]);
      const matchesDateRange =
        startDate >= dateRange.from && startDate <= dateRange.to;
      const matchesSprint = row["Sprint"]
        ?.toLowerCase()
        .includes(sprintFilter.toLowerCase());

      return matchesDateRange && matchesSprint;
    });
  }, [fileData, dateRange, sprintFilter, holidays]);

  const totalHours = useMemo(() => {
    const total = filteredData.reduce((sum, row) => {
      const startDate = new Date(row["Campo personalizado (Actual start)"]);
      const endDate = new Date(row["Resuelta"]);

      const hours = parseFloat(calculateWorkingHours(startDate, endDate));

      return isNaN(hours) ? sum : sum + hours;
    }, 0);

    return parseFloat(total.toFixed(2));
  }, [filteredData, holidays]);

  // Function to export filtered data to Excel with selected columns
  const exportToExcel = () => {
    const visibleColumns = columns
      .filter((column) => columnVisibility[column.id as string])
      .map((column) => column.id as string);

    // Crear datos a exportar incluyendo columnas calculadas
    const dataToExport = filteredData.map((row) => {
      const filteredRow: { [key: string]: string | number } = {};
      visibleColumns.forEach((col) => {
        if (col === "diasLaborales") {
          const startDate = new Date(row["Campo personalizado (Actual start)"]);
          const endDate = new Date(row["Resuelta"]);
          filteredRow[col] = calculateWorkingDays(startDate, endDate);
        } else if (col === "horasLaborales") {
          const startDate = new Date(row["Campo personalizado (Actual start)"]);
          const endDate = new Date(row["Resuelta"]);
          filteredRow[col] = calculateWorkingHours(startDate, endDate);
        } else {
          filteredRow[col] = row[col];
        }
      });
      return filteredRow;
    });

    // Crear encabezado para el total de horas
    const totalHoursRow = { "Total Horas Laborales": totalHours };
    const formattedDataToExport = [totalHoursRow, ...dataToExport];

    const worksheet = XLSX.utils.json_to_sheet(formattedDataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // Exportar a archivo Excel
    XLSX.writeFile(workbook, "reportes_excelsis.xlsx");
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Datos</h1>

      <div className="mb-6">
        <label
          htmlFor="file-upload"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Cargar archivo CSV o Excel
        </label>
        <Input
          id="file-upload"
          type="file"
          onChange={handleFileUpload}
          accept=".csv, .xlsx, .xls"
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        />
      </div>

      <div className="mb-6">
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
            <DatePickerWithRange
              date={dateRange}
              setDate={(date) =>
                setDateRange({
                  from: date?.from ?? new Date(),
                  to: date?.to ?? new Date(),
                })
              }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columnas <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <Button onClick={exportToExcel} variant="outline" className="mb-2">
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
