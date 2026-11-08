import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { Download } from 'lucide-react';

const exportFormats = [
  { id: 'pdf', label: 'Exportar PDF' },
  { id: 'excel', label: 'Exportar Excel' },
  { id: 'csv', label: 'Exportar CSV' },
  { id: 'xml', label: 'Exportar XML' },
];

export default function DataExportMenu({
  columns,
  rows,
  filename,
  title,
  details,
  disabled = false,
  onError,
  onExportPdf,
  secondary,
}) {
  const [anchor, setAnchor] = useState(null);

  const exportData = async (format) => {
    const numberedColumns = [{ key: 'reportRowNumber', label: 'N.º' }, ...columns];
    const numberedRows = rows.map((row, index) => ({
      ...row,
      reportRowNumber: index + 1,
    }));
    const options = {
      columns: numberedColumns,
      rows: numberedRows,
      filename,
      title,
      details,
      secondary: secondary ? {
        columns: [{ key: 'reportRowNumber', label: 'N.º' }, ...secondary.columns],
        rows: secondary.rows.map((row, index) => ({ ...row, reportRowNumber: index + 1 })),
      } : undefined,
    };
    try {
      const exporters = await import('../utils/dataExport');
      if (format === 'pdf') {
        if (onExportPdf) await onExportPdf(options);
        else exporters.exportTableToPdf(options);
      }
      if (format === 'excel') exporters.exportTableToExcel(options);
      if (format === 'csv') exporters.exportTableToCsv(options);
      if (format === 'xml') exporters.exportTableToXml(options);
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Download size={17} />}
        disabled={disabled || rows.length === 0}
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label="Exportar dados"
      >
        Exportar
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {exportFormats.map(({ id, label }) => (
          <MenuItem
            key={id}
            onClick={() => {
              setAnchor(null);
              exportData(id);
            }}
          >
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
