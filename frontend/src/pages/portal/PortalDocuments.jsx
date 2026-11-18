import { getPortalDocuments } from '../../services/api';
import DocumentsPanel from './DocumentsPanel';

export default function PortalDocuments() {
  return <DocumentsPanel loader={getPortalDocuments} />;
}
