export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline
            points="4,13 9,18 20,7"
            stroke="#10b981"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-light uppercase tracking-widest text-slate-400">
          Relatório
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-black tracking-tight text-teal-600">Rápido</span>
          <span className="rounded bg-slate-900 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
            NR-12
          </span>
        </div>
      </div>
    </div>
  )
}
