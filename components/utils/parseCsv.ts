import { parse } from "date-fns";
import { es } from "date-fns/locale";

type FileData = { [key: string]: string | number | null };

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr || typeof dateStr !== "string") return null;
  try {
    const parsedDate = parse(dateStr.trim(), "dd/MMM/yy h:mm a", new Date(), {
      locale: es,
    });
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch (e) {
    console.warn(`Error al parsear fecha: "${dateStr}"`, e);
    return null;
  }
};

const parseCsvManually = (csvContent: string): FileData[] => {
  const rows = csvContent
    .split(/\r?\n/) // Separar filas
    .filter((line) => line.trim() !== ""); // Eliminar filas vacías

  if (rows.length < 2) {
    throw new Error(
      "El archivo CSV debe tener al menos una fila de encabezados y una fila de datos."
    );
  }

  // Obtener encabezados y manejar claves duplicadas
  const rawHeaders = extractCsvRowValues(rows[0], Number.MAX_SAFE_INTEGER);
  const headers = rawHeaders.map((header, index, array) => {
    // Añadir sufijo si hay duplicados
    const count = array.slice(0, index).filter((h) => h === header).length;
    return count > 0 ? `${header}_${count}` : header;
  });

  const maxColumns = headers.length; // Límite de columnas basado en encabezados
  const data: FileData[] = [];

  rows.slice(1).forEach((row) => {
    const values = extractCsvRowValues(row, maxColumns); // Limitar la cantidad de valores
    // Construir fila de datos
    const parsedRow = headers.reduce<Record<string, string | number | null>>(
      (obj, header, index) => {
        const value = values[index]?.trim() || ""; // Valores vacíos tratados como cadenas vacías
        if (
          header.startsWith("Campo personalizado (Actual start)") ||
          header.startsWith("Resuelta") ||
          header.startsWith("Actualizada")
        ) {
          const parsedDate = parseDate(value);
          obj[header] = parsedDate ? parsedDate.toISOString() : null; // Convertir fechas a ISO
        } else {
          obj[header] = value;
        }
        return obj;
      },
      {}
    );
    data.push(parsedRow);
  });

  console.log("Datos procesados del CSV:", data);
  return data;
};

// Mejorada: Extraer valores considerando comillas y comas internas
const extractCsvRowValues = (row: string, maxColumns: number): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"' && (i === 0 || row[i - 1] !== "\\")) {
      // Cambiar el estado de las comillas
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      // Encontrar coma fuera de comillas; finalizar valor actual
      if (row[i + 1] === " ") {
        current += char;
      } else {
        values.push(current.trim());
        current = "";
      }
    } else {
      // Agregar carácter al valor actual
      if (inQuotes) {
        inQuotes = !inQuotes;
      }
      current += char;
    }
  }
  if (current) {
    values.push(current.trim());
  }

  // Limpiar comillas externas y manejar dobles comillas escapadas
  return values.slice(0, maxColumns).map((value) =>
    value.startsWith('"') && value.endsWith('"')
      ? value.slice(1, -1).replace(/""/g, '"') // Eliminar dobles comillas escapadas
      : value
  );
};

export { parseCsvManually };
