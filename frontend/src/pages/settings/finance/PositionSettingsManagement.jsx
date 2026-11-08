import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@mui/material';
import { BriefcaseBusiness } from 'lucide-react';
import {
  createFinancePosition,
  deleteFinancePosition,
  getFinancePositions,
  updateFinancePosition,
} from '../../../services/api';
import FinanceCatalogSection from './FinanceCatalogSection';

export default function PositionSettingsManagement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getFinancePositions());
    } catch (loadError) {
      setError(loadError.response?.data?.message || loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="cacoin-course-page cacoin-settings-page cacoin-test-settings-page">
      <header className="cacoin-page-heading">
        <div>
          <h1><BriefcaseBusiness size={23} aria-hidden="true" /> Cargos</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      <FinanceCatalogSection
        audit="FinancePosition"
        title="Novo Cargo"
        icon={BriefcaseBusiness}
        items={items}
        loading={loading}
        withAmount={false}
        nameLabel="Cargo"
        showDate
        onCreate={createFinancePosition}
        onUpdate={updateFinancePosition}
        onDelete={deleteFinancePosition}
        onChanged={load}
      />
    </section>
  );
}
