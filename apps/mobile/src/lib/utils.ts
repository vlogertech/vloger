export const formatCount = (n?: number): string => {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
};

export const timeAgo = (date?: string): string => {
  if (!date) return '';
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  if (m < 1) return 'maintenant';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}j`;
};

export const formatTime = (date?: string): string => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export const formatDuration = (seconds?: number): string => {
  if (!seconds) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
