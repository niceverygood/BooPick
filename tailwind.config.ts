import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'"Pretendard Variable"',
  				'Pretendard',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'system-ui',
  				'sans-serif',
  			],
  			num: ['var(--font-inter)', '"Pretendard Variable"', 'system-ui', 'sans-serif'],
  		},
  		colors: {
  			navy: {
  				'50': '#f1f5fa',
  				'100': '#dbe5f0',
  				'200': '#b8c9dd',
  				'300': '#88a3c2',
  				'400': '#4e6e94',
  				'500': '#1f3f6a',
  				'600': '#14305a',
  				'700': '#0d264c',
  				'800': '#0a2540',
  				'900': '#061a30'
  			},
  			'brand-orange': {
  				'50': '#fff4ec',
  				'100': '#ffe1cf',
  				'200': '#ffc0a0',
  				'300': '#ff9b6d',
  				'400': '#ff7d44',
  				'500': '#ff6b35',
  				'600': '#ec5520',
  				'700': '#c43d10',
  				'800': '#8c2a0a'
  			},
  			cream: {
  				'50': '#fdfcf9',
  				'100': '#faf7f2',
  				'200': '#f3eee4',
  				'300': '#e8e0d0'
  			},
  			safe: '#16a34a',
  			warn: '#d97706',
  			risk: '#dc2626',
  			kakao: {
  				DEFAULT: '#FEE500',
  				ink: '#181600'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: 'hsl(var(--destructive))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			boopick: {
  				navy: 'hsl(var(--boopick-navy))',
  				orange: 'hsl(var(--boopick-orange))',
  				green: 'hsl(var(--boopick-green))',
  				cream: 'hsl(var(--boopick-cream))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
