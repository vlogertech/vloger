import { Camera } from 'lucide-react';
import { uploadFile } from '@/lib/storage';

export default function CoverPhoto({ bannerUrl, isOwn, onUpdate }) {
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadFile(file);
    onUpdate(url);
  };

  return (
    <div className="relative" style={{ height: 160, backgroundColor: '#161616', overflow: 'hidden' }}>
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="w-full h-full object-cover" style={{ filter: 'brightness(0.65)' }} />
      ) : (
        <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #222 50%, #1a1a1a 100%)' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111111 0%, transparent 55%)' }} />

      {isOwn && (
        <label className="absolute top-3 right-3 cursor-pointer">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.3)', backdropFilter: 'blur(4px)' }}
          >
            <Camera size={11} strokeWidth={1.2} style={{ color: '#C9A84C' }} />
            <span className="text-xs font-light" style={{ color: '#C9A84C', letterSpacing: '0.08em', fontSize: '10px' }}>COUVERTURE</span>
          </div>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}
    </div>
  );
}