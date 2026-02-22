export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      ::-webkit-scrollbar { width:4px }
      ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px }
      ::-webkit-scrollbar-track { background:transparent }
      @keyframes nodeIn { from { opacity:0; transform: scale(0.82) translateY(8px); } to { opacity:1; transform: scale(1) translateY(0); } }
      @keyframes pulseRing { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:0.15; transform:scale(1.06); } }
      @keyframes edgeDraw { from { stroke-dashoffset: 800; } to { stroke-dashoffset: 0; } }
    `}</style>
  );
}
