import { useEffect, useState } from 'react';
import { Alert, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { getOnlineClassPlatforms } from '../../services/api';
import './online-classes.css';

const platformLabels = {
  GOOGLE_MEET: 'Google Meet',
  ZOOM: 'Zoom',
  TEAMS: 'Microsoft Teams',
  OTHER: 'Outro',
};

export default function OnlineClassPlatformPage({ platform }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const label = platformLabels[platform] || platform;

  useEffect(() => {
    let mounted = true;
    getOnlineClassPlatforms()
      .then((settings) => {
        if (!mounted) return;
        const setting = settings.find((item) => item.platform === platform);
        if (!setting?.url) {
          setError('A plataforma não está configurada.');
          return;
        }
        setUrl(setting.url);
      })
      .catch((loadError) => {
        if (mounted) {
          setError(
            loadError.response?.data?.message ||
              loadError.message ||
              'Não foi possível carregar a plataforma.',
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [platform]);

  return (
    <section className="online-class-platform-page">
      {url && !loading && (
        <Tooltip title="Abrir noutro separador">
          <IconButton
            className="online-class-platform-open"
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir plataforma noutro separador"
            size="small"
          >
            <ExternalLink size={19} />
          </IconButton>
        </Tooltip>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {loading && (
        <div className="online-class-platform-loading">
          <CircularProgress size={28} aria-label="A carregar a plataforma" />
        </div>
      )}
      {!loading && url && (
        <iframe
          className="online-class-platform-frame"
          src={url}
          title={label}
          allow="camera; microphone; display-capture; autoplay; clipboard-read; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </section>
  );
}
