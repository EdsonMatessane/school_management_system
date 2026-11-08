import { schoolProfileKey } from '../utils/institution';
import { useMemo } from 'react';
import { Box, Chip, Divider, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { formatDate } from '../utils/date';
import { websiteLabel } from '../utils/website';

const readHeader = () => {
  try {
    const profile = JSON.parse(window.localStorage.getItem(schoolProfileKey()) || '{}');
    return {
      profile: profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {},
      logo: window.localStorage.getItem('cacoin.logo') || '',
      footer: window.localStorage.getItem('cacoin.schoolReportFooter') || '',
    };
  } catch {
    return { profile: {}, logo: '', footer: '' };
  }
};

const sectionTitleSx = {
  px: 1.5,
  py: 0.6,
  bgcolor: '#052e5e',
  color: '#fff',
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 0.4,
};

/** Recibo imprimível: usa o mesmo modelo que exportReceiptToPdf. */
export default function ReceiptView({ receipt }) {
  const { profile, logo, footer } = useMemo(readHeader, []);
  const contacts = [
    profile.institutionAddress,
    profile.institutionPrimaryPhone,
    profile.institutionEmail,
    profile.institutionWebsite ? websiteLabel(profile.institutionWebsite) : '',
  ].filter(Boolean);
  const paid = receipt.status?.toLowerCase() === 'pago';

  return (
    <Box
      sx={{
        border: '1px solid #c8d0d8',
        borderRadius: 1,
        bgcolor: '#fff',
        color: '#19232d',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        {logo && (
          <Box component="img" src={logo} alt="" sx={{ width: 64, height: 64, objectFit: 'contain' }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontSize: 18, fontWeight: 700, color: '#052e5e' }}>
            {profile.institutionName || 'Nome da Instituição'}
          </Box>
          {profile.institutionSlogan && (
            <Box sx={{ fontStyle: 'italic', fontSize: 13 }}>{profile.institutionSlogan}</Box>
          )}
          {profile.institutionNuit && (
            <Box sx={{ fontSize: 12, color: '#465564' }}>NUIT: {profile.institutionNuit}</Box>
          )}
          {contacts.length > 0 && (
            <Box sx={{ fontSize: 12, color: '#465564' }}>{contacts.join(' · ')}</Box>
          )}
        </Box>
      </Box>
      <Divider sx={{ borderColor: '#052e5e', borderBottomWidth: 2 }} />

      <Box sx={{ p: 2.5, display: 'grid', gap: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ fontSize: 20, fontWeight: 700, color: '#052e5e', letterSpacing: 1 }}>
            {receipt.title}
          </Box>
          <Box sx={{ fontSize: 13, color: '#465564', mt: 0.5 }}>
            Recibo N.º <strong>{receipt.number}</strong> · Emitido em {formatDate(receipt.issueDate)}
          </Box>
          <Chip
            size="small"
            label={receipt.status}
            color={paid ? 'success' : receipt.status === 'EM ATRASO' ? 'error' : 'warning'}
            sx={{ mt: 1, fontWeight: 700 }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {receipt.sections.map((section) => (
            <Box key={section.title} sx={{ border: '1px solid #d5dce3', borderRadius: 0.5 }}>
              <Box sx={sectionTitleSx}>{section.title}</Box>
              <Box sx={{ p: 1.5, display: 'grid', gap: 0.6 }}>
                {section.rows.map(([label, value]) => (
                  <Box
                    key={label}
                    sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1, fontSize: 14 }}
                  >
                    <Box sx={{ color: '#465564', fontWeight: 600 }}>{label}</Box>
                    <Box sx={{ wordBreak: 'break-word' }}>{value || '—'}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ border: '1px solid #d5dce3', borderRadius: 0.5, overflowX: 'auto' }}>
          <Box sx={sectionTitleSx}>Detalhes do pagamento</Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                {receipt.columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={{ fontWeight: 700, bgcolor: '#eef3f9', whiteSpace: 'nowrap' }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {receipt.items.map((item, itemIndex) => (
                <TableRow key={itemIndex}>
                  {receipt.columns.map((column) => (
                    <TableCell key={column.key} align={column.align} sx={{ whiteSpace: 'nowrap' }}>
                      {item[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                {receipt.columns.map((column) => (
                  <TableCell
                    key={column.key}
                    align={column.align}
                    sx={{ fontWeight: 700, bgcolor: '#e1ecf7', color: '#052e5e', whiteSpace: 'nowrap' }}
                  >
                    {receipt.totals[column.key] ?? ''}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ border: '1px solid #d5dce3', borderRadius: 0.5, overflowX: 'auto' }}>
          <Box sx={sectionTitleSx}>Pagamentos efectuados</Box>
          {receipt.payments.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Data', 'Descrição', 'Método', 'Referência'].map((label) => (
                    <TableCell key={label} sx={{ fontWeight: 700, bgcolor: '#eef3f9' }}>
                      {label}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#eef3f9' }}>
                    Valor
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {receipt.payments.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(payment.date)}</TableCell>
                    <TableCell>{payment.description}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{payment.reference}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {payment.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Box sx={{ p: 1.5, fontSize: 14, fontStyle: 'italic' }}>
              Ainda não existem pagamentos registados.
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 4, pt: 3 }}>
          {['O Estudante', 'A Secretaria'].map((label) => (
            <Box key={label} sx={{ flex: 1, textAlign: 'center', fontSize: 12 }}>
              <Box sx={{ borderTop: '1px solid #19232d', mx: 2, pt: 0.5 }}>{label}</Box>
            </Box>
          ))}
        </Box>
      </Box>
      {footer && (
        <>
          <Divider />
          <Box sx={{ p: 1.5, fontSize: 12, color: '#465564', textAlign: 'center' }}>{footer}</Box>
        </>
      )}
    </Box>
  );
}
