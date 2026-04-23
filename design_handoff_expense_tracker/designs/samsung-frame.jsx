// Samsung S23 device frame — slim bezels, centered hole-punch camera, dark.
// Designed to wrap a full-bleed dark app. Content area is 360x780 CSS px.

function SamsungS23Frame({ children, showNav = true }) {
  return (
    <div style={{
      position: 'relative',
      width: 374, // 360 + 2*7 bezel
      height: 794,
      borderRadius: 46,
      padding: 7,
      background: 'linear-gradient(145deg, #2a2d34 0%, #14151a 50%, #2a2d34 100%)',
      boxShadow:
        '0 40px 100px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.35), inset 0 0 0 1.5px #0a0a0d',
      boxSizing: 'border-box',
    }}>
      {/* inner bezel */}
      <div style={{
        width: '100%', height: '100%',
        borderRadius: 40,
        background: '#000',
        padding: 2,
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* screen */}
        <div style={{
          width: 356, height: 776,
          borderRadius: 38,
          overflow: 'hidden',
          position: 'relative',
          background: '#0b1020',
          boxSizing: 'border-box',
        }}>
          {/* Status bar */}
          <div style={{
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            position: 'relative',
            zIndex: 20,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'system-ui, -apple-system, Roboto, sans-serif',
            letterSpacing: 0.2,
          }}>
            <span style={{ marginTop: 4 }}>9:41</span>
            {/* Hole-punch camera (centered) */}
            <div style={{
              position: 'absolute', left: '50%', top: 10,
              transform: 'translateX(-50%)',
              width: 10, height: 10, borderRadius: '50%',
              background: '#000',
              boxShadow: 'inset 0 0 0 1px #111, inset 0 0 2px rgba(80,80,80,0.5)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              {/* signal */}
              <svg width="15" height="11" viewBox="0 0 15 11" fill="#fff">
                <rect x="0" y="8" width="2.5" height="3" rx="0.5"/>
                <rect x="3.5" y="6" width="2.5" height="5" rx="0.5"/>
                <rect x="7" y="3.5" width="2.5" height="7.5" rx="0.5"/>
                <rect x="10.5" y="0" width="2.5" height="11" rx="0.5"/>
              </svg>
              {/* wifi */}
              <svg width="14" height="11" viewBox="0 0 14 11" fill="#fff">
                <path d="M7 11l2.2-2.8a3 3 0 00-4.4 0L7 11zm0-4.3a5 5 0 014 2L12.5 7A7 7 0 007 5a7 7 0 00-5.5 2L3 8.7a5 5 0 014-2zm0-3.3a8.2 8.2 0 016.3 3L14 3.2A10 10 0 007 0 10 10 0 000 3.2L1.7 6.4A8.2 8.2 0 017 3.4z"/>
              </svg>
              {/* battery */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <div style={{
                  width: 22, height: 10,
                  border: '1.2px solid #fff',
                  borderRadius: 3,
                  padding: 1,
                  boxSizing: 'border-box',
                }}>
                  <div style={{ width: '80%', height: '100%', background: '#fff', borderRadius: 1 }} />
                </div>
                <div style={{ width: 1.5, height: 4, background: '#fff', borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* App content */}
          <div style={{
            position: 'absolute',
            top: 32, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column',
          }}>
            {children}
          </div>

          {/* Gesture nav handle */}
          {showNav && (
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 6,
              display: 'flex', justifyContent: 'center', zIndex: 20,
              pointerEvents: 'none',
            }}>
              <div style={{
                width: 112, height: 4, borderRadius: 2,
                background: 'rgba(255,255,255,0.55)',
              }} />
            </div>
          )}
        </div>
      </div>

      {/* side buttons */}
      <div style={{
        position: 'absolute', right: -2, top: 140,
        width: 3, height: 54, borderRadius: 2,
        background: '#1a1b20',
      }} />
      <div style={{
        position: 'absolute', left: -2, top: 160,
        width: 3, height: 40, borderRadius: 2,
        background: '#1a1b20',
      }} />
      <div style={{
        position: 'absolute', left: -2, top: 208,
        width: 3, height: 72, borderRadius: 2,
        background: '#1a1b20',
      }} />
    </div>
  );
}

Object.assign(window, { SamsungS23Frame });
