import { Camera } from 'lucide-react';
import { uploadFile } from '@/lib/storage';

export default function AvatarPhoto({ avatarUrl, name, size = 68, isOwn, onUpdate, uploading, setUploading }) {
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading?.(true);
    const url = await uploadFile(file);
    onUpdate(url);
    setUploading?.(false);
  };

  const initial = (name || 'V')[0].toUpperCase();

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: size, height: size,
          backgroundColor: '#1a1a1a',
          border: '2.5px solid #111111',
          color: '#C9A84C',
          fontSize: size * 0.3,
          fontWeight: 200,
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          : initial
        }
      </div>
      {isOwn && (
        <label className="absolute bottom-0 right-0 cursor-pointer">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#C9A84C', border: '2px solid #111111' }}
          >
            {uploading
              ? <div className="w-2 h-2 border border-black border-t-transparent rounded-full animate-spin" />
              : <Camera size={10} strokeWidth={1.5} style={{ color: '#111' }} />
            }
          </div>
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
      )}
    </div>
  );
}