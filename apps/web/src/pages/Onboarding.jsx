import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    number: '01',
    title: 'La voix\navant tout.',
    subtitle: 'Partage tes pensées, histoires et émotions avec l\'authenticité de ta voix.',
    visual: 'voice',
  },
  {
    number: '02',
    title: 'Des vlogs\nqui captivent.',
    subtitle: 'Publie tes films du quotidien. Connecte-toi à des millions de créateurs.',
    visual: 'video',
  },
  {
    number: '03',
    title: 'Une communauté\nde créateurs.',
    subtitle: 'Rejoins les meilleurs créateurs de contenu. Sans filtres, sans retouches.',
    visual: 'community',
  },
];

function Visual({ type }) {
  if (type === 'voice') {
    return (
      <div className="flex items-end justify-center gap-px h-28">
        {[...Array(42)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: `${15 + Math.sin(i * 0.5) * 70 + Math.cos(i * 1.1) * 25}%`,
              backgroundColor: i % 3 === 0 ? '#C9A84C' : '#2a2a2a',
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    );
  }
  if (type === 'video') {
    return (
      <div className="relative mx-auto" style={{ width: 220, height: 124, borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
        <img
          src="https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=440&h=248&fit=crop&q=80"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.7)' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(201,168,76,0.25) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '12px solid #C9A84C', marginLeft: 2 }} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 justify-center">
      {[
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&q=80',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&q=80',
      ].map((url, i) => (
        <div
          key={i}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            overflow: 'hidden',
            border: i === 1 ? '1.5px solid #C9A84C' : '1px solid #2a2a2a',
            marginTop: i === 1 ? 0 : 14,
          }}
        >
          <img src={url} alt="" className="w-full h-full object-cover" style={{ filter: 'grayscale(30%)' }} />
        </div>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#111111' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-14 pb-8">
        <span className="text-xs font-light tracking-widest" style={{ color: '#C9A84C', letterSpacing: '0.2em' }}>
          VLOGER
        </span>
        <Link to="/login" className="text-xs font-light" style={{ color: '#444', letterSpacing: '0.05em' }}>
          Se connecter
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-8">
        {/* Number */}
        <p className="text-xs font-light mb-16" style={{ color: '#333', letterSpacing: '0.1em' }}>
          {slide.number} / 03
        </p>

        {/* Visual */}
        <div className="mb-16">
          <Visual type={slide.visual} />
        </div>

        {/* Text */}
        <div className="flex-1">
          <h2
            className="text-4xl font-light text-white mb-5"
            style={{ lineHeight: 1.15, letterSpacing: '-0.01em', whiteSpace: 'pre-line' }}
          >
            {slide.title}
          </h2>
          <p className="text-sm font-light leading-relaxed" style={{ color: '#666', maxWidth: 280 }}>
            {slide.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-8 pb-14">
        {/* Dots */}
        <div className="flex gap-2 mb-10">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 24 : 6,
                height: 1,
                backgroundColor: i === current ? '#C9A84C' : '#333',
                transition: 'all 0.3s ease',
                border: 'none',
              }}
            />
          ))}
        </div>

        {isLast ? (
          <div className="space-y-3">
            <Link
              to="/register"
              className="flex items-center justify-between w-full px-7 py-4"
              style={{ backgroundColor: '#C9A84C', borderRadius: 2 }}
            >
              <span className="text-xs font-light tracking-widest" style={{ color: '#111111', letterSpacing: '0.12em' }}>
                CRÉER UN COMPTE
              </span>
              <ChevronRight size={14} strokeWidth={1.2} style={{ color: '#111111' }} />
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center w-full px-7 py-4"
              style={{ border: '1px solid #2a2a2a', borderRadius: 2 }}
            >
              <span className="text-xs font-light tracking-widest" style={{ color: '#555', letterSpacing: '0.12em' }}>
                SE CONNECTER
              </span>
            </Link>
          </div>
        ) : (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="flex items-center justify-between w-full px-7 py-4"
            style={{ border: '1px solid #2a2a2a', borderRadius: 2 }}
          >
            <span className="text-xs font-light tracking-widest" style={{ color: '#666', letterSpacing: '0.12em' }}>
              SUIVANT
            </span>
            <ChevronRight size={14} strokeWidth={1.2} style={{ color: '#C9A84C' }} />
          </button>
        )}
      </div>
    </div>
  );
}