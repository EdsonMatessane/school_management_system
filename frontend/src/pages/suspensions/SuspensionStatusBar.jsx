import { Box } from '@mui/material';
import { Check } from 'lucide-react';

const steps = ['Pagamento pendente', 'Pago', 'Trancado'];

export const reachedSteps = ({ paid, suspended }) => {
  if (suspended) return 3;
  return paid ? 2 : 1;
};

export default function SuspensionStatusBar({ paid, suspended }) {
  const reached = reachedSteps({ paid, suspended });
  const color = suspended ? '#2e7d32' : 'var(--secondary)';
  const label = steps[reached - 1];

  return (
    <Box
      role="img"
      aria-label={`Estado: ${label}`}
      title={label}
      sx={{ display: 'flex', minWidth: 250, py: 0.5 }}
    >
      {steps.map((step, index) => {
        const active = index < reached;
        const connectorActive = index + 1 < reached;
        const isLast = index === steps.length - 1;
        return (
          <Box key={step} sx={{ flex: isLast ? '0 0 auto' : 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: active ? color : 'var(--border)',
                  bgcolor: active ? color : 'transparent',
                  color: '#fff',
                }}
              >
                {active && <Check size={11} strokeWidth={3} aria-hidden="true" />}
              </Box>
              {!isLast && (
                <Box
                  sx={{
                    flex: 1,
                    height: 4,
                    mx: 0.5,
                    borderRadius: 2,
                    bgcolor: connectorActive ? color : 'var(--border)',
                  }}
                />
              )}
            </Box>
            <Box
              component="span"
              sx={{
                display: 'block',
                mt: 0.5,
                fontSize: 11,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              {step}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
