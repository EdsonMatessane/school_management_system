import { useCallback } from 'react';
import { getLookupDocuments } from '../../services/api';
import DocumentsPanel from '../portal/DocumentsPanel';

export default function LookupDocuments({ code }) {
  const loader = useCallback(() => getLookupDocuments(code), [code]);
  return <DocumentsPanel loader={loader} />;
}
