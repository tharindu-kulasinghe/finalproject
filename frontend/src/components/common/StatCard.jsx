import clsx from 'clsx';
import { TrendingDown, TrendingUp } from 'lucide-react';

const colorMap = {
  primary: {
    bg: 'bg-primary-50',
    icon: 'text-primary-600',
    trend: 'text-primary-600'
  },
  success: {
    bg: 'bg-success-50',
    icon: 'text-success-600',
    trend: 'text-success-600'
  },
  warning: {
    bg: 'bg-warning-50',
    icon: 'text-warning-600',
    trend: 'text-warning-600'
  },
  danger: {
    bg: 'bg-danger-50',
    icon: 'text-danger-600',
    trend: 'text-danger-600'
  },
  info: {
    bg: 'bg-info-50',
    icon: 'text-info-600',
    trend: 'text-info-600'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    trend: 'text-purple-600'
  }
};

const StatCard = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  trendLabel,
  className = ''
}) => {
  const colors = colorMap[color] || colorMap.primary;

  return (
    <div className={clsx('border border-gray-200 bg-white p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
          {trend !== undefined &&
          <div className="flex items-center gap-1.5 mt-2">
              <span className={clsx(
              'inline-flex items-center text-xs font-medium',
              trend >= 0 ? 'text-success-600' : 'text-danger-600'
            )}>
                {trend >= 0 ?
              <TrendingUp className="mr-0.5 h-3.5 w-3.5" /> :

              <TrendingDown className="mr-0.5 h-3.5 w-3.5" />
              }
                {Math.abs(trend)}%
              </span>
              {trendLabel &&
            <span className="text-xs text-gray-400">{trendLabel}</span>
            }
            </div>
          }
        </div>
        <div className={clsx('w-11 h-11  flex items-center justify-center shrink-0', colors.bg)}>
          {typeof icon === 'string' ?
          <span className="text-xl">{icon}</span> :

          <div className={colors.icon}>{icon}</div>
          }
        </div>
      </div>
    </div>);

};

export default StatCard;