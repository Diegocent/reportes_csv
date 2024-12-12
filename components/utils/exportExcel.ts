import { VisibilityState } from "@tanstack/react-table";
import {
  calculateWorkingDays,
  calculateWorkingHours,
} from "./calcularHorasDias";
import * as XLSX from "xlsx";
import { ColumnDef } from "@tanstack/react-table";
type FileData = { [key: string]: string | number | null };
const exportToExcel = (
  columns: ColumnDef<FileData, unknown>[],
  columnVisibility: VisibilityState,
  filteredData: unknown[],
  holidays: Date[],
  totalHours: number
) => {
  const visibleColumns = columns
    .filter((column) => columnVisibility[column.id as string])
    .map((column) => column.id as string);

  // Crear datos a exportar incluyendo columnas calculadas
  const dataToExport = filteredData.map((row) => {
    const filteredRow: { [key: string]: string | number } = {};
    visibleColumns.forEach((col) => {
      if (col === "diasLaborales") {
        const startDate = new Date(
          (row as FileData)["Campo personalizado (Actual start)"] ?? ""
        );
        const endDate = new Date((row as FileData)["Resuelta"] ?? "");
        filteredRow[col] = calculateWorkingDays(startDate, endDate, holidays);
      } else if (col === "horasLaborales") {
        const startDate = new Date(
          (row as FileData)["Campo personalizado (Actual start)"] ?? ""
        );
        const endDate = new Date((row as FileData)["Resuelta"] ?? "");
        filteredRow[col] = calculateWorkingHours(startDate, endDate, holidays);
      } else {
        filteredRow[col] = (row as FileData)[col] ?? "";
      }
    });
    return filteredRow;
  });

  // Crear encabezado para el total de horas
  const totalHoursRow = { "Total Horas Laborales": totalHours };
  const formattedDataToExport = [...dataToExport, totalHoursRow];

  const worksheet = XLSX.utils.json_to_sheet(formattedDataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  // Exportar a archivo Excel
  XLSX.writeFile(workbook, "reportes_excelsis.xlsx");
};

export { exportToExcel };
