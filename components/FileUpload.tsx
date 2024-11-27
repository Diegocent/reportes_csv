import React from "react";
import { Input } from "@/components/ui/input";

interface FileUploadProps {
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ handleFileUpload }) => {
  return (
    <div className="mb-6 w-full max-w-md flex flex-col">
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
        className="file:mr-6 file:py-2 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 file:w-auto file:overflow-visible h-12"
      />
    </div>
  );
};
