import MoreActionsButton from './MoreActionsButton';

const reportActions = [
  { value: 'copy', label: 'Copiar dados' },
  { value: 'paste', label: 'Colar dados' },
  { value: 'pdf', label: 'Exportar pdf' },
  { value: 'zip', label: 'Exportar zip (pdf + anexos)' },
];

export default function ReportMoreActions({
  onExecute,
  disabled = false,
  actions = reportActions,
}) {
  return (
    <div className="report-more-actions">
      <MoreActionsButton
        actions={actions}
        onAction={onExecute}
        disabled={disabled}
      />
    </div>
  );
}
