import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
  ],
  safelist: [
    // Quick Actions 위젯용 동적 색상 클래스
    'bg-blue-100', 'bg-blue-200', 'text-blue-600',
    'bg-green-100', 'bg-green-200', 'text-green-600',
    'bg-purple-100', 'bg-purple-200', 'text-purple-600',
    'bg-orange-100', 'bg-orange-200', 'text-orange-600',
    'bg-teal-100', 'bg-teal-200', 'text-teal-600',
    'bg-indigo-100', 'bg-indigo-200', 'text-indigo-600',
    'bg-red-100', 'bg-red-200', 'text-red-600',
    'bg-emerald-100', 'bg-emerald-200', 'text-emerald-600',
    'bg-cyan-100', 'bg-cyan-200', 'text-cyan-600',
    'bg-amber-100', 'bg-amber-200', 'text-amber-600',
    'bg-rose-100', 'bg-rose-200', 'text-rose-600',
    'bg-slate-100', 'bg-slate-200', 'text-slate-600',
  ],
  // TODO: safelist 제거 - Quick Actions 위젯 시맨틱 토큰 전환 후
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			success: {
  				DEFAULT: 'var(--success)',
  				foreground: 'var(--success-foreground)'
  			},
  			warning: {
  				DEFAULT: 'var(--warning)',
  				foreground: 'var(--warning-foreground)'
  			},
  			info: {
  				DEFAULT: 'var(--info)',
  				foreground: 'var(--info-foreground)'
  			},
  			event: {
  				class: 'var(--event-class)',
  				exam: 'var(--event-exam)',
  				consultation: 'var(--event-consultation)',
  				payment: 'var(--event-payment)',
  				task: 'var(--event-task)',
  				birthday: 'var(--event-birthday)',
  				holiday: 'var(--event-holiday)',
  				event: 'var(--event-event)',
  				other: 'var(--event-other)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			sidebar: {
  				DEFAULT: 'var(--sidebar)',
  				foreground: 'var(--sidebar-foreground)',
  				primary: 'var(--sidebar-primary)',
  				'primary-foreground': 'var(--sidebar-primary-foreground)',
  				accent: 'var(--sidebar-accent)',
  				'accent-foreground': 'var(--sidebar-accent-foreground)',
  				border: 'var(--sidebar-border)',
  				ring: 'var(--sidebar-ring)'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: ['var(--font-sans)'],
  			serif: ['var(--font-serif)'],
  			mono: ['var(--font-mono)']
  		},
  		letterSpacing: {
  			tighter: 'var(--tracking-tighter)',
  			tight: 'var(--tracking-tight)',
  			normal: 'var(--tracking-normal)',
  			wide: 'var(--tracking-wide)',
  			wider: 'var(--tracking-wider)',
  			widest: 'var(--tracking-widest)'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
}
export default config