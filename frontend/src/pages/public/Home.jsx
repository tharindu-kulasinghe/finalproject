import { Link } from 'react-router-dom';
import {
  QrCode,
  FileText,
  Search,
  Wine,
  CreditCard,
  Bell,
  HelpCircle,
  MapPin,
  Factory,
  LogIn,
  Truck
} from
  'lucide-react';

const StartTile = ({
  to,
  title,
  subtitle,
  icon: Icon,
  color,
  dark,
  colClass,
  minHeightClass = 'min-h-[100px]',
  iconSize = 56,
  titleClass = 'text-base font-semibold tracking-tight'
}) =>
  <Link
    to={to}
    className={[
      'group relative block min-h-0 min-w-0 overflow-hidden border border-black/10 shadow-sm outline-none transition-[filter,transform] duration-150 touch-manipulation',
      'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#e8ecf1]',
      'hover:brightness-110 active:brightness-95 active:scale-[0.99]',
      colClass,
      minHeightClass,
      dark ? 'bg-neutral-100' : ''].filter(Boolean).join(' ')}
    style={!dark ? { backgroundColor: color } : undefined}>

    <div
      className={`absolute inset-0 pointer-events-none ${dark ? 'opacity-[0.07]' : 'opacity-[0.12]'} transition-opacity group-hover:opacity-20`}
      style={!dark ? { background: 'linear-gradient(135deg, #fff 0%, transparent 55%)' } : undefined} />

    <div
      className={`absolute -bottom-3 -right-2 pointer-events-none transition-transform duration-200 group-hover:scale-105 ${dark ? 'text-neutral-400' : 'text-white'}`}
      style={{ opacity: dark ? 0.35 : 0.22 }}>

      <Icon size={iconSize} strokeWidth={1.25} aria-hidden />
    </div>
    <div className="relative z-10 flex h-full min-h-0 flex-col justify-center p-2.5 sm:p-4">
      <h2 className={`break-words ${titleClass} leading-snug ${dark ? 'text-neutral-900' : 'text-white'}`}>
        {title}
      </h2>
      {subtitle ?
        <p className={`mt-1 text-[11px] leading-snug line-clamp-3 sm:text-sm sm:line-clamp-2 ${dark ? 'text-neutral-600' : 'text-white/85'}`}>
          {subtitle}
        </p> :
        null}
    </div>
  </Link>;


const HomePage = () => {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center overflow-x-hidden bg-[#e8ecf1] py-3 text-gray-900 sm:py-6">
      <div className="min-w-0 px-2 sm:px-4 lg:px-6">
        <div
          className="mx-auto grid w-full min-w-0 max-w-6xl grid-flow-dense grid-cols-2 gap-2 auto-rows-[minmax(88px,auto)] sm:grid-cols-4 sm:auto-rows-[minmax(96px,auto)] sm:gap-2 md:grid-cols-8 md:gap-2.5 md:auto-rows-[minmax(104px,auto)]">

          <StartTile
            to="/verify"
            title="Verify stamp"
            subtitle="Check authenticity of tax stamps and products"
            icon={QrCode}
            color="#b91c1c"
            dark={false}
            colClass="col-span-2 row-span-2 sm:col-span-4 sm:row-span-2 md:col-span-4 md:row-span-2 min-h-[168px] sm:min-h-[200px] md:min-h-[240px]"
            iconSize={88}
            titleClass="text-lg font-semibold tracking-tight sm:text-2xl md:text-3xl" />

          <StartTile
            to="/login"
            title="Sign in"
            subtitle="License holders & staff"
            icon={LogIn}
            color="#1e3a5f"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/apply/manufacturing"
            title="Manufacturing"
            subtitle="Public application"
            icon={Factory}
            color="#b45309"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/apply/distribution"
            title="Distribution"
            subtitle="Public application"
            icon={Truck}
            color="#1d4ed8"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/apply/retail"
            title="Retail & hospitality"
            subtitle="Public application"
            icon={Wine}
            color="#c2410c"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/help"
            title="Application help"
            subtitle="Requirements and next steps"
            icon={FileText}
            color="#0f766e"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/help"
            title="Track application"
            subtitle="Use the reference from your confirmation"
            icon={Search}
            color="#6d28d9"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/payments"
            title="Tax payments"
            subtitle="Online payments"
            icon={CreditCard}
            color="#047857"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/contact"
            title="Contact"
            subtitle="Regional offices"
            icon={MapPin}
            color="#5b21b6"
            dark={false}
            colClass="col-span-1 row-span-1 sm:col-span-2 md:col-span-2" />

          <StartTile
            to="/notices"
            title="Notices"
            subtitle="Announcements and circulars"
            icon={Bell}
            color="#0e7490"
            dark={false}
            colClass="col-span-2 row-span-1 sm:col-span-4 md:col-span-4"
            minHeightClass="min-h-[92px] sm:min-h-[100px] md:min-h-[112px]"
            iconSize={64}
            titleClass="text-base font-semibold sm:text-lg md:text-xl" />

          <StartTile
            to="/help"
            title="Help & support"
            subtitle="FAQs and assistance"
            icon={HelpCircle}
            color="#e5e5e5"
            dark
            colClass="col-span-2 row-span-1 sm:col-span-4 md:col-span-4"
            minHeightClass="min-h-[92px] sm:min-h-[100px] md:min-h-[112px]"
            iconSize={64}
            titleClass="text-base font-semibold sm:text-lg md:text-xl" />
        </div>
      </div>
    </div>);

};

export default HomePage;
