interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtext?: string;
}

export function StatsCard({ label, value, icon, subtext }: StatsCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#a0a0a0] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          {subtext && <p className="text-xs text-[#6a6a6a] mt-1">{subtext}</p>}
        </div>
        {icon && <div className="text-primary-400">{icon}</div>}
      </div>
    </div>
  );
}
