import React from 'react';

interface LogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export function LogoBancoNacion({ className = '', showSubtitle = true }: LogoProps) {
  return (
    <div className={`inline-flex items-center bg-white border-2 border-red-600 rounded-xl px-3 py-1.5 shadow-xs shrink-0 select-none ${className}`}>
      {/* Icono del Calendario y Reloj de Agendamiento */}
      <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0 mr-2.5 flex items-center justify-center">
        <svg className="w-full h-full text-red-600" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cuerpo del Calendario */}
          <rect x="8" y="18" width="70" height="68" rx="12" fill="#C8102E" />
          <rect x="22" y="10" width="7" height="16" rx="3.5" fill="#C8102E" />
          <rect x="57" y="10" width="7" height="16" rx="3.5" fill="#C8102E" />

          {/* Cuadrícula interna */}
          <rect x="16" y="42" width="54" height="38" rx="5" fill="#FFFFFF" />
          <rect x="21" y="47" width="8" height="8" rx="2" fill="#C8102E" />
          <rect x="33" y="47" width="8" height="8" rx="2" fill="#C8102E" />
          <rect x="45" y="47" width="8" height="8" rx="2" fill="#C8102E" />
          <rect x="57" y="47" width="8" height="8" rx="2" fill="#C8102E" />
          <rect x="21" y="59" width="8" height="8" rx="2" fill="#C8102E" />
          <rect x="33" y="59" width="8" height="8" rx="2" fill="#C8102E" />
          <rect x="21" y="71" width="8" height="8" rx="2" fill="#C8102E" />
          <rect x="33" y="71" width="8" height="8" rx="2" fill="#C8102E" />

          {/* Escudo simplificado superior */}
          <circle cx="43" cy="27" r="7" fill="#F59E0B" />

          {/* Reloj con Checkmark */}
          <circle cx="68" cy="65" r="23" fill="#FFFFFF" stroke="#C8102E" strokeWidth="5.5" />
          <circle cx="68" cy="65" r="2" fill="#C8102E" />
          <path d="M68 65L58 55" stroke="#C8102E" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M68 65L77 57" stroke="#C8102E" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M72 70L78 76L89 61" stroke="#C8102E" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Contenedor Tipográfico perfectamente encajado sin desbordamientos */}
      <div className="flex flex-col justify-center text-left leading-none">
        <span className="text-red-600 font-black tracking-tight text-sm leading-tight uppercase">
          BANCO
        </span>
        <span className="text-red-600 font-black tracking-tight text-xs leading-none uppercase">
          DE LA NACIÓN
        </span>

        {showSubtitle && (
          <div className="pt-1 mt-0.5 border-t border-red-600/70">
            <span className="block text-red-600 font-bold text-[7px] sm:text-[7.5px] tracking-wider uppercase leading-none whitespace-nowrap">
              AGENDAMIENTO DE CITAS Y ORIENTACIÓN
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
