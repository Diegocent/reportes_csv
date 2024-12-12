import Papa from "papaparse";
import { parse, format, isValid } from "date-fns";
import { es } from "date-fns/locale";

const extractCsvRowValues = (row: string, maxColumns: number): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"' && (i === 0 || row[i - 1] !== "\\")) {
      // Cambiar estado de comillas
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      // Fin de valor actual si no estamos en comillas
      values.push(current.trim());
      current = "";
    } else {
      // Agregar carácter al valor actual
      current += char;
    }
  }

  // Agregar último valor
  if (current) {
    values.push(current.trim());
  }

  // Limpiar comillas externas y manejar dobles comillas escapadas
  return values.slice(0, maxColumns).map((value) => {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/""/g, '"'); // Reemplazar dobles comillas
    }
    return value === '""' ? "" : value;
  });
};

// Regex para detectar fechas en diferentes formatos, incluyendo milisegundos con 2 dígitos
const dateFormatRegex =
  /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})|(\d{2}\/[a-zA-Z]{3}\/\d{2} \d{1,2}:\d{2} (AM|PM))|(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{2,3})/;

// Función para identificar si una cadena es una fecha válida con el formato esperado
const isDate = (value: string): boolean => {
  return dateFormatRegex.test(value);
};

// Función para convertir una cadena de fecha al formato deseado
const formatDate = (value: string): string => {
  if (isDate(value)) {
    try {
      // Si la fecha es en formato ISO con milisegundos (2 o 3 dígitos)
      if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{2,3}/.test(value)) {
        const parsedDate = new Date(value);
        // Si la fecha es válida, la formateamos
        if (isValid(parsedDate)) {
          return format(parsedDate, "yyyy-MM-dd HH:mm:ss");
        } else {
          console.error("Fecha no válida:", value);
          return value; // Retornamos el valor original si no es una fecha válida
        }
      }

      // Si la fecha está en formato dd/MMM/yy hh:mm a
      const parsedDate = parse(value, "dd/MMM/yy hh:mm a", new Date(), {
        locale: es,
      });
      if (isValid(parsedDate)) {
        return format(parsedDate, "yyyy-MM-dd HH:mm:ss");
      } else {
        console.error("Fecha no válida:", value);
        return value; // Retornamos el valor original si no es una fecha válida
      }
    } catch (error) {
      console.error("Error al parsear la fecha:", error);
      return value; // Retornamos el valor original si hubo un error al parsear
    }
  }

  // Si no es una fecha en el formato esperado, retornamos el valor original
  return value;
};

const alignColumns = (
  headers: string[],
  row: string[]
): Record<string, string> => {
  const alignedRow: Record<string, string> = {};
  const headerCount: Record<string, number> = {};
  let rowCorrected;

  if (row.length <= 1) {
    rowCorrected = extractCsvRowValues(row[0], headers.length);
  } else {
    rowCorrected = row;
  }

  headers.forEach((header, index) => {
    // Comprobamos si el valor es una fecha y lo procesamos
    let cellValue = rowCorrected[index] || "";

    // Solo si el valor es una fecha, la procesamos
    cellValue = formatDate(cellValue);
    // Si el encabezado ya ha sido encontrado, incrementamos su contador
    if (headerCount[header]) {
      headerCount[header]++;
      // Actualizamos la clave del encabezado con el número de aparición
      alignedRow[`${header}_${headerCount[header]}`] = cellValue;
    } else {
      // Si es la primera vez que encontramos este encabezado, lo agregamos sin sufijo
      headerCount[header] = 1;
      alignedRow[header] = cellValue;
    }
  });

  return alignedRow;
};

/**
 * Procesa el archivo CSV y normaliza las filas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseCSV = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as string[][];
        const headers = rows[0] || []; // Detecta las cabeceras del archivo
        console.log("headers ", headers);
        rows.shift();

        const alignedData = rows.map((row) => alignColumns(headers, row));

        resolve(alignedData);
      },
      error: (error) => reject(error),
    });
  });
};

export { parseCSV };
